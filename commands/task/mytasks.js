const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Task2 = require("../../models/task2.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mytask")
        .setDescription("View your claimed tasks"),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64  });

        const CHANNEL_TEAMS = {
            "1448189002057257093": "graphic",
            "1448189025491091597": "dev",
        };

        const team = CHANNEL_TEAMS[interaction.channelId];
        if (!team) return interaction.editReply("❌ Use in team task channel.");

        const userId = interaction.user.id;
        const tasks = await Task2.find({ team });

        const claimed = tasks.filter(t => 
            t.assignedTo.includes(userId) && t.status !== "completed"
        );

        const completed = tasks.filter(t => 
            t.assignedTo.includes(userId) && t.status === "completed"
        );

        const embed = new EmbedBuilder()
            .setTitle(`📌 Your Tasks (${team} team)`)
            .addFields(
                {
                    name: "🔄 Active Tasks",
                    value: claimed.length
                        ? claimed.map(t => `• **${t.taskId}** ${t.title}`).join("\n")
                        : "None"
                },
                {
                    name: "✅ Completed Tasks",
                    value: completed.length
                        ? completed.map(t => `• **${t.taskId}** ${t.title}`).join("\n")
                        : "None"
                }
            )
            .setColor(team === "graphic" ? "Purple" : "Blue");

        return interaction.editReply({ embeds: [embed] });
    }
};
