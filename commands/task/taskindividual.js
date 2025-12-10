const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Task2 = require('../../models/task2.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('taskindividual')
        .setDescription('View tasks for a user or team stats')
        .addStringOption(option =>
            option
                .setName('target')
                .setDescription('Type @user or "gfx" for graphic team stats')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const target = interaction.options.getString('target');
        
        // GFX TEAM STATS
        if (target.toLowerCase() === 'gfx' || target.toLowerCase() === 'graphic') {
            const allTasks = await Task2.find({ team: 'graphic' });
            if (allTasks.length === 0) return interaction.editReply(`📭 No graphic tasks found.`);

            let totalTasks = 0, completedTasks = 0, claimedTasks = 0;
            allTasks.forEach(task => {
                totalTasks++;
                if (task.status === 'completed') completedTasks++;
                if (task.assignedTo.length > 0) claimedTasks++;
            });

            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            const gfxEmbed = new EmbedBuilder()
                .setTitle(`🎨 Graphic Designer Team Stats`)
                .setColor('Purple')
                .addFields(
                    { name: '📊 Overall', value: `• **Total:** ${totalTasks}\n• **Completed:** ${completedTasks}\n• **In Progress:** ${claimedTasks}`, inline: true },
                    { name: '📈 Progress', value: `**${completionRate}%** completed`, inline: true }
                );

            return interaction.editReply({ embeds: [gfxEmbed] });
        }

        // INDIVIDUAL USER
        let targetUser;
        const mentionMatch = target.match(/<@!?(\d+)>/);
        if (mentionMatch) {
            try {
                targetUser = await interaction.client.users.fetch(mentionMatch[1]);
            } catch (err) {
                targetUser = null;
            }
        }
        
        if (!targetUser) return interaction.editReply("⚠️ Mention a user like @username or type 'gfx' for team stats.");

        const userId = targetUser.id;
        const username = targetUser.username;

        // Find user's tasks
        const allTasks = await Task2.find({});
        const userTasks = [];
        
        allTasks.forEach(task => {
            if (task.assignedTo.includes(userId)) {
                userTasks.push({
                    taskId: task.taskId,
                    title: task.title,
                    team: task.team,
                    status: task.status,
                    selected: task.selected === userId
                });
            }
        });

        if (userTasks.length === 0) return interaction.editReply(`📭 **${username}** has no tasks.`);

        const userEmbed = new EmbedBuilder()
            .setTitle(`👤 Tasks for ${username}`)
            .setColor('Purple')
            .setThumbnail(targetUser.displayAvatarURL())
            .setDescription(`**${userTasks.length} total tasks**`);

        let taskList = '';
        userTasks.forEach(task => {
            const statusEmoji = task.status === 'completed' ? '✅' : task.status === 'claimed' ? '🔄' : '📝';
            const selectedStar = task.selected ? ' ⭐' : '';
            taskList += `${statusEmoji} **${task.taskId}** - ${task.title} (${task.team})${selectedStar}\n`;
        });
        
        userEmbed.addFields({ name: 'Tasks', value: taskList, inline: false });
        await interaction.editReply({ embeds: [userEmbed] });
    }
};
