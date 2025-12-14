const { SlashCommandBuilder } = require("discord.js");
const Task = require("../../models/task.js");

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

        const task = await Task.findOne({ taskId });

        if (!task)
            return interaction.editReply("❌ Task not found.");

        // TEAM DETECTION
        let team = null;
        if (interaction.channelId === process.env.GRAPHIC_CHANNEL) team = "graphic";
        else if (interaction.channelId === process.env.DEV_CHANNEL) team = "dev";
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