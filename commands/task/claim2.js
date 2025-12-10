const { SlashCommandBuilder } = require("discord.js");
const Task2 = require("../../models/task2.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("claim2")
        .setDescription("Claim a task")
        .addStringOption(o =>
            o.setName("taskid")
             .setDescription("Task ID to claim")
             .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;

        // TEAM DETECTION
        let team = null;

        if (interaction.channelId === "1448189002057257093") team = "graphic";
        else if (interaction.channelId === "1448189025491091597") team = "dev";
        else return interaction.editReply("❌ This command must be used inside the graphics or dev task channels.");

        const id = interaction.options.getString("taskid");
        const task = await Task2.findOne({ taskId: id });

        if (!task)
            return interaction.editReply("❌ Task not found.");

        if (task.team !== team)
            return interaction.editReply("❌ You cannot claim a task from another team.");

        // ❗ ALLOW claiming even if the task is already claimed by others
        if (task.status === "completed")
            return interaction.editReply("❌ This task is already completed.");

        // ✨ ALLOW MULTIPLE CLAIMANTS
        if (!task.assignedTo.includes(userId)) {
            task.assignedTo.push(userId);
        } else {
            return interaction.editReply(`❌ You have already claimed **${task.taskId}**.`);
        }

        // If the task was "open", change it to "claimed"
        if (task.status === "open") {
            task.status = "claimed";
        }

        await task.save();

        return interaction.editReply(`✅ You have successfully claimed **${task.taskId}**.`);
    }
};