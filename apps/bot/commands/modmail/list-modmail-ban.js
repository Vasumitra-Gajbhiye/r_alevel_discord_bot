const { ModmailBan } = require("@ralevel/db");
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list-modmail-ban")
    .setDescription("List users banned from using modmail.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const bans = await ModmailBan.find().sort({ createdAt: -1 });

    if (bans.length === 0) {
      return interaction.editReply({
        content: "No users are currently banned from modmail.",
      });
    }

    const formattedList = bans
      .map((ban, i) => `**${i + 1}.** <@${ban.userId}> — ${ban.reason}`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("Modmail-banned users")
      .setDescription(formattedList.slice(0, 4096))
      .setColor(0xed4245)
      .setTimestamp()
      .setFooter({ text: "Use /unban-user-modmail to remove a ban." });

    return interaction.editReply({ embeds: [embed] });
  },
};
