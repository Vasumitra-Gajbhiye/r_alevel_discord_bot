const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Task2 = require("../../models/task2.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mytasks2")
        .setDescription("View your claimed, finished, and unclaimed tasks"),

    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        // TEAM CHECK
        let team = null;
        if (interaction.channelId === "1448189002057257093") team = "graphic";
        else if (interaction.channelId === "1448189025491091597") team = "dev";
        else return interaction.editReply("❌ Use inside a graphics or dev task channel.");

        const userId = interaction.user.id;

        const tasks = await Task2.find({ team });

        const finished = tasks.filter(t => t.finishedBy.includes(userId));

const claimed = tasks.filter(t => 
    t.assignedTo.includes(userId) &&
    !t.finishedBy.includes(userId)
);
        const unclaimed = tasks.filter(t => !t.assignedTo.includes(userId));

        const embed = new EmbedBuilder()
            .setTitle(`📌 Your Tasks (${team} team)`)
            .addFields(
                {
                    name: "🎨 Claimed Tasks",
                    value: claimed.length
                        ? claimed.map(t => `• **${t.taskId}** ${t.title}`).join("\n")
                        : "None"
                },
                {
                    name: "✅ Finished Tasks",
                    value: finished.length
                        ? finished.map(t => `• **${t.taskId}** ${t.title}`).join("\n")
                        : "None"
                },
                {
                    name: "📂 Tasks You Haven't Claimed",
                    value: unclaimed.length
                        ? unclaimed.map(t => `• **${t.taskId}** ${t.title}`).join("\n")
                        : "None"
                }
            )
            .setColor(team === "graphic" ? "Purple" : "Blue");

        return interaction.editReply({ embeds: [embed] });
    }
};