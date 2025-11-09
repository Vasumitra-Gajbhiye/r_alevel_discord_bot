// const {
//   ButtonBuilder,
//   ButtonStyle,
//   SlashCommandBuilder,
//   ActionRowBuilder
// } = require("discord.js");

// module.exports = {
//   data: new SlashCommandBuilder()
//     .setName("helper")
//     .setDescription("Ping a helper in any subjects channel"),
//   async execute(interaction) {



//     const user = interaction.options.getUser("target");

//     const cancel = new ButtonBuilder()
//       .setCustomId("cancel")
//       .setLabel("Cancel Ping")
//       .setStyle(ButtonStyle.Success);
//     const row = new ActionRowBuilder().addComponents(cancel);

//     const time = `<t:${parseInt((interaction.createdTimestamp / 1000) + 600, 10)}:R>`
//     const response = await interaction.reply({
//         content: `The helper of this channel ${interaction.channel.topic} will be automatically be pinged (${time})\n If your issue has been resolved, please click the Cancel Ping button.`,
//         components: [row],
//     });
    
//     const collectorFilter = i => i.user.id === interaction.user.id;
// try {
// 	const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 10_000 });

// 	if (confirmation.customId === 'cancel') {
    
// 		await confirmation.update({ content: `Ping has been cancelled`, components: [] });
// 	} 
// } catch (e) {
//   const pingRole = interaction.channel.topic
//   interaction.channel.send({ content: `<@&${pingRole}>, help is needed by <@${interaction.user.id}>`, components: [] })
// 	await interaction.deleteReply()
// }


//   },
// };

// commands/helper/helper.js

const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder
} = require("discord.js");

const HelperRole = require("../../models/helperRole.js"); // <-- correct relative path

module.exports = {
  data: new SlashCommandBuilder()
    .setName("helper")
    .setDescription("Request help from the assigned subject helper in this channel."),

  async execute(interaction) {
    const channelId = interaction.channel.id;

    // Fetch helper role assigned to this channel
    const helperData = await HelperRole.findOne({ channelId });
    if (!helperData) {
      return interaction.reply({
        content: "⚠️ This channel does not have a helper role assigned.\nAsk a staff member to run **/sethelper @role** in this channel.",
        ephemeral: true
      });
    }

    const helperRoleId = helperData.roleId;

    // Cancel request button
    const cancelBtn = new ButtonBuilder()
      .setCustomId("cancel_request")
      .setLabel("Cancel Request")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(cancelBtn);

    // Time: 10 minutes from now, displayed as relative time
    const triggerTime = Math.floor(Date.now() / 1000) + 10;
    const relativeTime = `<t:${triggerTime}:R>`;

    // Embed message to reduce clutter and look clean
    const embed = new EmbedBuilder()
      .setTitle("⏳ Helper Request Pending")
      .setDescription(
        `A helper will be pinged **${relativeTime}**.\n\n` +
        `If your issue is solved before that, click **Cancel Request** to stop the ping.`
      )
      .setColor("#00AEEF");

    const msg = await interaction.reply({
      embeds: [embed],
      components: [row]
    });

    try {
      // Wait up to 10 minutes for cancel button press
      const button = await msg.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 10_000
      });

      if (button.customId === "cancel_request") {
        await button.update({
          content: "✅ Helper request cancelled.",
          embeds: [],
          components: []
        });
      }

    } catch {
      // No cancel → automatically ping
      await interaction.channel.send({
        content: `📩 <@&${helperRoleId}> — help requested by <@${interaction.user.id}>`
      });

      // Clean chat
      await interaction.deleteReply();
    }
  }
};