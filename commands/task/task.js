const { SlashCommandBuilder } = require('discord.js');
const Task2 = require('../../models/task2.js');
const { updateTaskDisplay } = require('../../utils/taskDisplay.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('task')
        .setDescription('Create multiple tasks at once')
        .addStringOption(option =>
            option
                .setName('tasks')
                .setDescription('Format: 1. Title: Description 2. Title: Description')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('deadline')
                .setDescription('Format: dd/mm/yyyy. Applies to all tasks.')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const CHANNEL_TEAMS = {
            "1448189002057257093": "graphic",
            "1448189025491091597": "dev",
        };

        const team = CHANNEL_TEAMS[interaction.channelId];
        if (!team) return interaction.editReply("❌ Use in team task channel.");

        const taskInput = interaction.options.getString('tasks');
        const deadline = interaction.options.getString('deadline');

        // Parse tasks with format: "1. Title: Description 2. Title: Description"
        // Support: "1. Title:Desc" and "1. Title: Desc" and "1. Title" (no description)
        const matches = taskInput.match(/\d+\s*[\.\-\)]\s*[^0-9]+(?=\d+\s*[\.\-\)]|$)/g) || [];

        if (matches.length === 0) {
            return interaction.editReply({
                content: "❌ Please format tasks like: `1. First Task 2. Second Task` or `1. Title: Description 2. Title: Description`"
            });
        }

        const tasks = [];
        for (const match of matches) {
            const content = match.replace(/^\d+\s*[\.\-\)]\s*/, "").trim();
            
            // Split by first colon to get title and description
            const colonIndex = content.indexOf(':');
            let title, description;
            
            if (colonIndex !== -1) {
                title = content.substring(0, colonIndex).trim();
                description = content.substring(colonIndex + 1).trim();
            } else {
                title = content;
                description = title; // Use title as description if no colon
            }
            
            tasks.push({ title, description });
        }

        // Get latest task ID
        const latest = await Task2.findOne().sort({ createdAt: -1 });
        let nextNumber = 1;
        if (latest && latest.taskId) {
            const match = latest.taskId.match(/tsk-(\d+)/);
            if (match) nextNumber = parseInt(match[1]) + 1;
        }

        const createdTasks = [];
        
        // Create tasks
        for (let i = 0; i < tasks.length; i++) {
            const { title, description } = tasks[i];
            const taskId = `tsk-${String(nextNumber + i).padStart(3, '0')}`;
            
            await Task2.create({
                taskId,
                team,
                title,
                description,
                deadline: deadline || null,
                channelId: interaction.channel.id,
                status: 'open',
                createdBy: interaction.user.id 
            });
            
            createdTasks.push({ taskId, title });
        }

        // Update display (shows only titles)
        await updateTaskDisplay(interaction.channel, team);

        await interaction.editReply({
            content: `✅ Created ${createdTasks.length} tasks!\n` +
                     createdTasks.map(t => `• **${t.taskId}** - ${t.title}`).join('\n') +
                     (deadline ? `\n📅 Deadline: ${deadline}` : '')
        });
    }
};







