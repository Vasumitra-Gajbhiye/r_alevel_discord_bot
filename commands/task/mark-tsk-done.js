const { SlashCommandBuilder } = require("discord.js");
const Task2 = require("../../models/task2.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mark-tsk-done")
        .setDescription("Mark a task as completed and select the final designer’s work (mods only)")
        .addStringOption(o =>
            o.setName("taskid")
             .setDescription("Task ID to complete")
             .setRequired(true)
        )
        .addUserOption(o =>
            o.setName("selected")
             .setDescription("Select the designer whose work is chosen (for graphic tasks)")
             .setRequired(false)
        ),

    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        const taskId = interaction.options.getString("taskid");
        const selectedUser = interaction.options.getUser("selected"); // ⭐ user object

        const task = await Task2.findOne({ taskId });

        if (!task)
            return interaction.editReply("❌ Task not found.");

        // TEAM DETECTION
        let team = null;
        if (interaction.channelId === "1448189002057257093") team = "graphic";
        else if (interaction.channelId === "1448189025491091597") team = "dev";
        else return interaction.editReply("❌ Use this inside a team task channel.");

        // SET TASK AS COMPLETED
        task.status = "completed";

        // SAVE SELECTED USER BY ID (GRAPHIC ONLY)
        if (team === "graphic" && selectedUser) {
            task.selected = selectedUser.id; // ⭐ store USER ID
        }

        await task.save();

        return interaction.editReply(
            `✅ **${taskId}** marked as fully completed.\n${
                selectedUser ? `⭐ Selected designer: <@${selectedUser.id}>` : ""
            }`
        );
    }
};