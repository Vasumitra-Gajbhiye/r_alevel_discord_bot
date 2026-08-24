const { ModmailBan } = require("@ralevel/db");
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const {
  closeOpenTicket,
  findOpenTicketByUser,
  buildBannedFromModmailEmbed,
} = require("../../systems/modmail");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban-user-modmail")
    .setDescription("Ban a user from opening modmail tickets.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to ban from modmail.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason shown to the user and in the ban list.")
        .setRequired(true)
        .setMaxLength(500),
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true).trim();

    if (!reason) {
      return interaction.reply({
        content: "Please provide a reason for the modmail ban.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const existing = await ModmailBan.findOne({ userId: target.id });
    await ModmailBan.updateOne(
      { userId: target.id },
      { $set: { reason, bannedBy: interaction.user.id } },
      { upsert: true },
    );

    const ticket = await findOpenTicketByUser(target.id);
    let ticketClosed = false;
    let archiveFailed = false;

    if (ticket) {
      let thread = null;
      try {
        thread = await interaction.client.channels.fetch(ticket.threadId);
      } catch {
        thread = null;
      }

      const result = await closeOpenTicket(ticket, {
        closedBy: interaction.user.id,
        thread,
        archiveReason: `Modmail banned by ${interaction.user.tag}`,
      });
      ticketClosed = true;
      archiveFailed = Boolean(result.archiveError) || !thread;
    }

    try {
      await target.send({
        embeds: [
          buildBannedFromModmailEmbed(reason, { ticketClosed }),
        ],
      });
    } catch {
      // User may have DMs closed.
    }

    const already = existing ? "already banned from modmail. Reason updated." : "banned from modmail.";
    let extra = "";
    if (ticketClosed && archiveFailed) {
      extra =
        " Their open ticket was closed, but I couldn't archive the post — please archive it manually.";
    } else if (ticketClosed) {
      extra = " Their open ticket was closed and archived.";
    }

    return interaction.editReply({
      content: `${target} has been ${already}${extra}`,
    });
  },
};
