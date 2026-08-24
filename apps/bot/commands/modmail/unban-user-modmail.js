const { ModmailBan } = require("@ralevel/db");
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unban-user-modmail")
    .setDescription("Allow a user to open modmail tickets again.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to unban from modmail.")
        .setRequired(true),
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user", true);

    const result = await ModmailBan.deleteOne({ userId: target.id });

    if (result.deletedCount === 0) {
      return interaction.reply({
        content: `${target} is not banned from modmail.`,
        ephemeral: true,
      });
    }

    return interaction.reply({
      content: `${target} can use modmail again.`,
      ephemeral: true,
    });
  },
};
