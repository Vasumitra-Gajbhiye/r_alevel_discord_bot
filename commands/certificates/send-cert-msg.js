const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
require("dotenv").config();


const APPLICATION_CHANNEL = process.env.APPLICATION_CHANNEL; 

module.exports = {
  data: new SlashCommandBuilder()
    .setName("send-cert-msg")
    .setDescription("Send the certificate application panel")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  async execute(interaction) {
    const channel = await interaction.client.channels.fetch(
      APPLICATION_CHANNEL
    );

    if (!channel || !channel.isTextBased()) {
      return interaction.reply({
        content: "❌ Application channel not found.",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("🧾 Certificate Application")
      .setDescription(
    "**__How to Apply:__**\n" +
    "Click on the relevant application button below.\n\n" +

    "**__Eligibility & Availability:__**\n" +
    "**Helper Certification**\n" +
    "• Maintain your Helper position for a minimum of 1 month, reach 100 Reputation, and achieve the rank of <@&1437727634711777450>.\n\n" +

    "**Writer Certification**\n" +
    "• Submit a minimum of 5 extensive and helpful blogs/pieces-of-writing to our website.\n\n" +

    "**Resource Contributor Certification**\n" +
    "• Submit a minimum of 5 informative documents or notes relevant to a subject(s).\n\n" +

    "**Graphic Designer Certification**\n" +
    "• Submit a minimum of 5 pieces of graphic design (must have been utilized) as a <@&1431092954100928583>.\n\n" +

    "**Moderator Certification**\n" +
    "• Achieve the rank of <@&1114447390724849725>.\n"  +
    "• Eligible Moderators can directly ping <@&1114451108811767928> to apply\n\n" +

    "Please ensure you meet the requirements before applying.\n" + 
    
    "If your DMs are closed, you'll receive updates in <#1444615091780583526> channel"
  )
      .setColor("#2CDAF2")
      .setFooter({
        text: "Only one pending application per certificate is permitted.",
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("apply_helper")
        .setLabel("Apply — Helper")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("apply_writer")
        .setLabel("Apply — Writer")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("apply_resource")
        .setLabel("Apply — Resource")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("apply_graphic")
        .setLabel("Apply — Graphic")
        .setStyle(ButtonStyle.Primary)
    );

    await channel.send({
      embeds: [embed],
      components: [row],
    });

    await interaction.reply({
      content: "✅ Certificate application panel sent.",
      ephemeral: true,
    });
  },
};