const { SlashCommandBuilder } = require("discord.js");
const Task2 = require("../../models/task2.js");
const { updateTaskDisplay } = require("../../utils/taskDisplay.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("claim")
        .setDescription("Claim a task")
        .addStringOption(o =>
            o.setName("taskid")
             .setDescription("Task ID to claim")
             .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const userId = interaction.user.id;
        const CHANNEL_TEAMS = {
            [process.env.GRAPHIC_CHANNEL_ID]: "graphic",
            [process.env.DEV_CHANNEL_ID]: "dev",
        };

        const team = CHANNEL_TEAMS[interaction.channelId];
        if (!team) return interaction.editReply("❌ Use in team task channel.");

        const id = interaction.options.getString("taskid");
        const task = await Task2.findOne({ taskId: id });

        if (!task) return interaction.editReply("❌ Task not found.");
        if (task.team !== team) return interaction.editReply("❌ Cannot claim task from another team.");
        if (task.status === "completed") return interaction.editReply("❌ Task already completed.");

        // Team-specific claim logic
        if (team === 'dev') {
            if (task.assignedTo.length > 0) {
                return interaction.editReply("❌ Task already claimed.");
            }
            task.assignedTo = [userId];
        } else {
            if (task.assignedTo.includes(userId)) {
                return interaction.editReply(`❌ You already claimed **${id}**.`);
            }
            task.assignedTo.push(userId);
        }

        if (task.status === "open") task.status = "claimed";
        await task.save();
        
        await updateTaskDisplay(interaction.channel, team);
        return interaction.editReply(`✅ Claimed **${id}**!`);
    }
};
