const { SlashCommandBuilder } = require("discord.js");
const Task2 = require("../../models/task2.js");
const { updateTaskDisplay } = require("../../utils/taskDisplay.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("done")
        .setDescription("Mark a task as completed (Mods only)")
        .addStringOption(o =>
            o.setName("taskid")
             .setDescription("Task ID to complete")
             .setRequired(true)
        )
        .addUserOption(o =>
            o.setName("selected")
             .setDescription("Select designer whose work is chosen (graphic only)")
             .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64  });

        const taskId = interaction.options.getString("taskid");
        const selectedUser = interaction.options.getUser("selected");
        const task = await Task2.findOne({ taskId });

        if (!task) return interaction.editReply("❌ Task not found.");

        const CHANNEL_TEAMS = {
            "1448189002057257093": "graphic",
            "1448189025491091597": "dev",
        };

        const team = CHANNEL_TEAMS[interaction.channelId];
        if (!team) return interaction.editReply("❌ Use in team task channel.");

        task.status = "completed";
        if (team === "graphic" && selectedUser) task.selected = selectedUser.id;
        await task.save();

        await updateTaskDisplay(interaction.channel, team);
        return interaction.editReply(
            `✅ **${taskId}** marked as completed.\n${
                selectedUser ? `⭐ Selected: <@${selectedUser.id}>` : ""
            }`
        );
    }
};
