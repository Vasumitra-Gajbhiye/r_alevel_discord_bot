const { SlashCommandBuilder } = require("discord.js");
const Task2 = require("../../models/task2.js");
const { updateTaskDisplay } = require("../../utils/taskDisplay.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("finished")
        .setDescription("Mark your claimed task as finished (with link)")
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
        await interaction.deferReply({ flags: 64  });

        const userId = interaction.user.id;
        const CHANNEL_TEAMS = {
            "1448189002057257093": "graphic",
            "1448189025491091597": "dev",
        };

        const team = CHANNEL_TEAMS[interaction.channelId];
        if (!team) return interaction.editReply("❌ Use in team task channel.");
        if (team !== "graphic") return interaction.editReply("❌ This command is for graphics team only.");

        const taskId = interaction.options.getString("taskid");
        const link = interaction.options.getString("link");
        const task = await Task2.findOne({ taskId });

        if (!task) return interaction.editReply("❌ Task not found.");
        if (task.team !== team) return interaction.editReply("❌ Not your team's task.");
        if (!task.assignedTo.includes(userId)) return interaction.editReply("❌ You didn't claim this task.");
        if (task.finishedBy.includes(userId)) return interaction.editReply("❌ Already marked as finished.");

        task.finishedBy.push(userId);
        task.finishedLinks.push(link);
        task.status = "finished";
        await task.save();

        await updateTaskDisplay(interaction.channel, team);
        return interaction.editReply(`✅ Marked **${taskId}** as finished!\n🔗 Link saved.`);
    }
};
