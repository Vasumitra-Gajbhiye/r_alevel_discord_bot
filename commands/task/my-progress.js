const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Task2 = require("../../models/task2.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("myprogress")
        .setDescription("View your task progress"),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64  });

        const userId = interaction.user.id;
        const CHANNEL_TEAMS = {
            "1448189002057257093": "graphic",
            "1448189025491091597": "dev",
        };

        const team = CHANNEL_TEAMS[interaction.channelId];
        if (!team) return interaction.editReply("❌ Use in team task channel.");

        const tasks = await Task2.find({ team });
        const totalTasks = tasks.length;
        const claimed = tasks.filter(t => t.assignedTo.includes(userId));
        const completed = tasks.filter(t => t.status === "completed" && t.assignedTo.includes(userId));

        const embed = new EmbedBuilder()
            .setTitle(`📊 Your Progress (${team} team)`)
            .addFields(
                { name: "📝 Total Tasks", value: String(totalTasks), inline: true },
                { name: "🎨 Claimed", value: String(claimed.length), inline: true },
                { name: "✅ Completed", value: String(completed.length), inline: true },
            )
            .setColor(team === "graphic" ? "Purple" : "Blue");

        // Graphic certificate progress
        if (team === "graphic") {
            const utilised = tasks.filter(t => t.selected === userId).length;
            const stars = "⭐".repeat(utilised) + "☆".repeat(5 - utilised);
            embed.addFields({ name: "🏆 Certificate Progress", value: `${stars} (${utilised}/5)` });
        }

        return interaction.editReply({ embeds: [embed] });
    }
};
