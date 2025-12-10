const { SlashCommandBuilder } = require("discord.js");
const Task2 = require("../../models/task2.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mark-tsk-finished")
        .setDescription("Mark your claimed task as finished")
        .addStringOption(o =>
            o.setName("taskid")
             .setDescription("Task ID")
             .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("link")
             .setDescription("Link to your finished work")
             .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;

        // TEAM DETECTION
        let team = null;
        if (interaction.channelId === "1448189002057257093") team = "graphic";
        else if (interaction.channelId === "1448189025491091597") team = "dev";
        else return interaction.editReply("❌ Use this command inside your team task channel.");

        const taskId = interaction.options.getString("taskid");
        const link = interaction.options.getString("link");

        const task = await Task2.findOne({ taskId });

        if (!task)
            return interaction.editReply("❌ Task not found.");

        if (task.team !== team)
            return interaction.editReply("❌ This task does not belong to your team.");

        if (!task.assignedTo.includes(userId))
            return interaction.editReply("❌ You cannot finish a task you did not claim.");

        // PREVENT DOUBLE-FINISH
        if (task.finishedBy.includes(userId))
            return interaction.editReply("❌ You have already marked this task as finished.");

        // SAVE FINISH RECORD
        task.finishedBy.push(userId);
        task.finishedLinks.push(link);

        await task.save();

        return interaction.editReply(
            `✅ You marked **${taskId}** as finished!\n🔗 Your link has been saved.`
        );
    }
};