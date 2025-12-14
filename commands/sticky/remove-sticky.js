const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const Sticky = require("../../models/sticky");
const logStickyAction = require("../../utils/logStickyAction");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove-sticky")
    .setDescription("Remove the sticky message from a channel")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Channel (defaults to current)")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages
    ),

  async execute(interaction) {
    const channel =
      interaction.options.getChannel("channel") ||
      interaction.channel;

    if (!channel.isTextBased()) {
      return interaction.reply({
        content: "❌ This is not a text channel.",
        ephemeral: true,
      });
    }

    const sticky = await Sticky.findOne({
      channelId: channel.id,
    });

    if (!sticky) {
      return interaction.reply({
        content: "ℹ️ No sticky exists here.",
        ephemeral: true,
      });
    }

    if (sticky.lastMessageId) {
      try {
        await channel.messages.delete(
          sticky.lastMessageId
        );
      } catch {}
    }

    await Sticky.deleteOne({
      channelId: channel.id,
    });

    interaction.client.stickies?.delete(channel.id);

    await interaction.reply({
      content: `🗑️ Sticky removed from ${channel}.`,
      ephemeral: true,
    });
    
    await logStickyAction({
  guildId: interaction.guildId,
  channelId: channel.id,
  moderator: interaction.user,
  action: "REMOVE",
});
  },
};