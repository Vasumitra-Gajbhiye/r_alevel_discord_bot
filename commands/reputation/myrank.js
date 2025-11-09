const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Reputation = require("../../models/reputation.js");
const { ROLE_BEGINNER, ROLE_INTERMEDIATE, ROLE_ADVANCED, ROLE_EXPERT, ROLE_GIGACHAD } = require("../../utils/roles.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("myrank")
    .setDescription("Check your reputation rank and progress."),

  async execute(interaction) {
    const userId = interaction.user.id;

    let repRecord = await Reputation.findOne({ userId });
    if (!repRecord) repRecord = await Reputation.create({ userId, rep: 0 });

    const rep = repRecord.rep;

    const tiers = [
      { amount: 1000, label: "Giga Chad", emoji: "💀" },
      { amount: 500, label: "Expert", emoji: "🔥" },
      { amount: 100, label: "Advance", emoji: "⚡" },
      { amount: 50, label: "Intermediate", emoji: "📈" },
      { amount: 10, label: "Beginner", emoji: "🌱" },
      { amount: 0, label: "Unranked", emoji: "❔" }
    ];

    const currentTier = tiers.find(t => rep >= t.amount);
    const nextTier = tiers.find(t => t.amount > rep);

    const progress = nextTier
      ? `${rep}/${nextTier.amount} rep needed for **${nextTier.label}**`
      : `🎉 You are at the **highest rank**!`;

    const embed = new EmbedBuilder()
      .setTitle(`${currentTier.emoji} ${interaction.user.username}'s Rank`)
      .addFields(
        { name: "Current Rank", value: currentTier.label, inline: true },
        { name: "Reputation", value: `${rep}`, inline: true },
        { name: "Progress", value: progress }
      )
      .setColor("#00AEEF")
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};