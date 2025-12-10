const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Task2 = require('../../models/task2.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('active-task')
        .setDescription('View details of a specific task')
        .addStringOption(option =>
            option
                .setName('taskid')
                .setDescription('Task ID (e.g., tsk-001)')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64  });

        const CHANNEL_TEAMS = {
            "1448189002057257093": "graphic",
            "1448189025491091597": "dev",
        };

        const team = CHANNEL_TEAMS[interaction.channelId];
        if (!team) return interaction.editReply("❌ Use in team task channel.");

        const taskId = interaction.options.getString('taskid');
        const task = await Task2.findOne({ taskId });

        if (!task) return interaction.editReply("❌ Task not found.");
        if (task.team !== team) return interaction.editReply("❌ This task doesn't belong to this team.");

        const embed = new EmbedBuilder()
            .setTitle(`📋 Task Details: ${task.title}`)
            .setColor(team === 'dev' ? 'Blue' : 'Purple')
            .addFields(
                { name: 'Task ID', value: task.taskId, inline: true },
                { name: 'Team', value: task.team, inline: true },
                { name: 'Status', value: task.status, inline: true },
                { name: 'Title', value: task.title, inline: false },
                { name: 'Description', value: task.description || 'No description', inline: false }
            );

        if (task.deadline) embed.addFields({ name: 'Deadline', value: task.deadline, inline: true });
        if (task.assignedTo.length > 0) {
            embed.addFields({ name: 'Claimed By', value: task.assignedTo.map(id => `<@${id}>`).join(', '), inline: false });
        }

        // Graphic-specific fields
        if (team === 'graphic') {
            if (task.resolution) embed.addFields({ name: 'Resolution', value: task.resolution, inline: true });
            if (task.fileFormat) embed.addFields({ name: 'File Format', value: task.fileFormat, inline: true });
            if (task.notes) embed.addFields({ name: 'Notes', value: task.notes, inline: false });
            if (task.fileNameFormat) embed.addFields({ name: 'File Name Format', value: task.fileNameFormat, inline: false });
            
            if (task.finishedBy.length > 0) {
                const finishedList = task.finishedBy.map((id, index) => 
                    `<@${id}>: ${task.finishedLinks[index] || 'No link'}`
                ).join('\n');
                embed.addFields({ name: 'Finished Submissions', value: finishedList, inline: false });
            }
            
            if (task.status === 'completed' && task.selected) {
                embed.addFields({ name: 'Selected Designer', value: `<@${task.selected}>`, inline: true });
            }
        }

        embed.addFields({ 
            name: 'Created', 
            value: `<t:${Math.floor(task.createdAt.getTime() / 1000)}:R>`, 
            inline: true 
        });

        await interaction.editReply({ embeds: [embed] });
    }
};
