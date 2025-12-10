const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const TaskBoard = require('../../models/task.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('taskindividual')
        .setDescription('View tasks for a user or GFX team stats')
        .addStringOption(option =>
            option
                .setName('target')
                .setDescription('Type @user or "gfx" for graphic team stats')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getString('target');
        
        // Check if they want GFX team stats
        if (target.toLowerCase() === 'gfx' || target.toLowerCase() === 'graphic' || 
            target.toLowerCase() === 'graphics' || target.toLowerCase() === 'designer') {
            
            // Get all boards
            const allBoards = await TaskBoard.find({ team: 'graphic' });
            
            if (allBoards.length === 0) {
                return interaction.editReply({
                    content: `📭 No graphic designer task boards found.`
                });
            }

            // Collect stats from all graphic boards
            let totalTasks = 0;
            let completedTasks = 0;
            let claimedTasks = 0;
            let unclaimedTasks = 0;
            
            const boardStats = [];
            
            allBoards.forEach(board => {
                const boardTotal = board.tasks.length;
                const boardCompleted = board.tasks.filter(t => t.status === 'Completed').length;
                const boardClaimed = board.tasks.filter(t => t.status === 'Claimed').length;
                const boardUnclaimed = board.tasks.filter(t => t.status === 'Unclaimed').length;
                
                totalTasks += boardTotal;
                completedTasks += boardCompleted;
                claimedTasks += boardClaimed;
                unclaimedTasks += boardUnclaimed;
                
                boardStats.push({
                    id: board.boardId,
                    total: boardTotal,
                    completed: boardCompleted,
                    claimed: boardClaimed,
                    unclaimed: boardUnclaimed
                });
            });

            // Calculate percentages
            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const progressRate = totalTasks > 0 ? Math.round(((completedTasks + claimedTasks) / totalTasks) * 100) : 0;

            // Create progress bar
            const createProgressBar = (percentage, length = 20) => {
                const filled = Math.round((percentage / 100) * length);
                const empty = length - filled;
                return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage}%`;
            };

            // Create the GFX team embed
            const gfxEmbed = new EmbedBuilder()
                .setTitle(`🎨 Graphic Designer Team Overview`)
                .setColor('Purple')
                .setDescription(`**Team Performance Across ${allBoards.length} Boards**`)
                .addFields(
                    {
                        name: '📊 Overall Stats',
                        value: `• **Total Tasks:** ${totalTasks}\n` +
                               `• **Completed:** ${completedTasks} (${completionRate}%)\n` +
                               `• **In Progress:** ${claimedTasks}\n` +
                               `• **Unclaimed:** ${unclaimedTasks}`,
                        inline: true
                    },
                    {
                        name: '📈 Progress',
                        value: `**Completion:** ${createProgressBar(completionRate)}\n` +
                               `**Overall Progress:** ${createProgressBar(progressRate)}`,
                        inline: true
                    }
                );

            // Add board-by-board breakdown if not too many
            if (boardStats.length <= 10) {
                let boardBreakdown = '';
                boardStats.forEach(stat => {
                    boardBreakdown += `**${stat.id}:** ${stat.completed}/${stat.total} done\n`;
                });
                
                gfxEmbed.addFields({
                    name: `📋 Board Breakdown (${boardStats.length} boards)`,
                    value: boardBreakdown || 'No boards',
                    inline: false
                });
            } else {
                // If too many boards, just show top 10
                let boardBreakdown = '';
                boardStats.slice(0, 10).forEach(stat => {
                    boardBreakdown += `**${stat.id}:** ${stat.completed}/${stat.total} done\n`;
                });
                
                gfxEmbed.addFields({
                    name: `📋 Top 10 Boards (of ${boardStats.length})`,
                    value: boardBreakdown,
                    inline: false
                });
            }

            // Add tips
            gfxEmbed.addFields({
                name: '💡 Team Notes',
                value: `• Graphic tasks show "Graphic Team" when claimed\n` +
                       `• Completed by Moderators\n` +
                       `• ${claimedTasks > 0 ? 'Currently working on ' + claimedTasks + ' tasks' : 'No active tasks at the moment'}`,
                inline: false
            });

            gfxEmbed.setFooter({ 
                text: `Graphic Designer Team | ${new Date().toLocaleDateString()}`
            });

            await interaction.editReply({ 
                embeds: [gfxEmbed]
            });
            return;
        }

        // --- ORIGINAL FORMAT FOR INDIVIDUAL USERS ---
        let targetUser;
        
        // Check if it's a user mention
        const mentionMatch = target.match(/<@!?(\d+)>/);
        if (mentionMatch) {
            const userId = mentionMatch[1];
            try {
                targetUser = await interaction.client.users.fetch(userId);
            } catch (err) {
                targetUser = null;
            }
        }
        
        if (!targetUser) {
            return interaction.editReply({
                content: `⚠️ Please mention a user like @username or type "gfx" for team stats.`
            });
        }

        const userId = targetUser.id;
        const username = targetUser.username;

        // Find ALL boards where this user has tasks
        const allBoards = await TaskBoard.find({});

        // Collect all tasks for this user across all boards
        const userTasks = [];
        const boardIds = new Set();
        
        allBoards.forEach(board => {
            board.tasks.forEach(task => {
                // For graphic team, only include if user is the mod who marked it done
                if (board.team === 'graphic') {
                    if (task.status === 'Completed' && task.completedBy === userId) {
                        userTasks.push({
                            boardId: board.boardId,
                            boardTeam: board.team,
                            taskNumber: task.number,
                            taskDescription: task.description,
                            status: 'Marked Done',
                            date: task.completedAt,
                            channelId: board.channelId,
                            messageId: board.messageId
                        });
                        boardIds.add(board.boardId);
                    }
                } else {
                    // For dev team: check if user claimed or completed
                    if (task.status === 'Claimed' && task.claimedBy === userId) {
                        userTasks.push({
                            boardId: board.boardId,
                            boardTeam: board.team,
                            taskNumber: task.number,
                            taskDescription: task.description,
                            status: task.status,
                            date: task.claimedAt,
                            channelId: board.channelId,
                            messageId: board.messageId
                        });
                        boardIds.add(board.boardId);
                    } else if (task.status === 'Completed' && task.claimedBy === userId) {
                        userTasks.push({
                            boardId: board.boardId,
                            boardTeam: board.team,
                            taskNumber: task.number,
                            taskDescription: task.description,
                            status: task.status,
                            date: task.completedAt,
                            channelId: board.channelId,
                            messageId: board.messageId
                        });
                        boardIds.add(board.boardId);
                    }
                }
            });
        });

        if (userTasks.length === 0) {
            return interaction.editReply({
                content: `📭 **${username}** doesn't have any assigned tasks across all boards.`
            });
        }

        // Separate dev and graphic tasks
        const devTasks = userTasks.filter(t => t.boardTeam === 'dev');
        const graphicTasks = userTasks.filter(t => t.boardTeam === 'graphic');

        // Calculate stats
        const claimedCount = devTasks.filter(t => t.status === 'Claimed').length;
        const completedCount = devTasks.filter(t => t.status === 'Completed').length;
        const completionRate = devTasks.length > 0 ? 
            Math.round((completedCount / devTasks.length) * 100) : 0;

        // Group tasks by board (for the original format)
        const tasksByBoard = {};
        userTasks.forEach(task => {
            if (!tasksByBoard[task.boardId]) {
                tasksByBoard[task.boardId] = {
                    team: task.boardTeam,
                    tasks: []
                };
            }
            tasksByBoard[task.boardId].tasks.push(task);
        });

        // Create the main embed in ORIGINAL FORMAT
        const userEmbed = new EmbedBuilder()
            .setTitle(`👤 Tasks Assigned to ${username}`)
            .setColor('Yellow')
            .setThumbnail(targetUser.displayAvatarURL())
            .setDescription(`**${userTasks.length} total tasks** across ${boardIds.size} ${boardIds.size === 1 ? 'board' : 'boards'}`);

        // Add summary section (like original)
        userEmbed.addFields(
            {
                name: '📊 Summary',
                value: `• **Total Tasks:** ${userTasks.length}\n` +
                       `• **In progress:** ${claimedCount}\n` +
                       `• **Completed:** ${completedCount}\n` +
                       `• **Boards:** ${Array.from(boardIds).join(', ')}`,
                inline: false
            }
        );

        // Add board sections (like original)
        Object.keys(tasksByBoard).forEach(boardId => {
            const boardData = tasksByBoard[boardId];
            const boardTasks = boardData.tasks;
            
            let boardField = '';
            boardTasks.forEach(task => {
                const statusEmoji = task.status === 'Completed' ? '✅' : '🔄';
                const dateStr = task.date ? 
                    new Date(task.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'N/A';
                
                if (boardData.team === 'graphic') {
                    boardField += `${statusEmoji} **Task ${task.taskNumber}:** ${task.taskDescription.substring(0, 50)}${task.taskDescription.length > 50 ? '...' : ''}\n`;
                    boardField += `   ↳ ${task.status === 'Marked Done' ? 'Marked as completed (Moderator)' : task.status} | Date: ${dateStr}\n`;
                } else {
                    boardField += `${statusEmoji} **Task ${task.taskNumber}:** ${task.taskDescription.substring(0, 50)}${task.taskDescription.length > 50 ? '...' : ''}\n`;
                    boardField += `   ↳ Status: **${task.status}** | Date: ${dateStr}\n`;
                }
            });
            
            userEmbed.addFields({
                name: `📋 ${boardId} (${boardData.team === 'dev' ? 'Dev' : 'Graphic'})`,
                value: boardField,
                inline: false
            });
        });

        // Add completion rate (like original)
        if (devTasks.length > 0) {
            userEmbed.addFields({
                name: '🎯 Completion Rate',
                value: `**${completionRate}%** (${completedCount}/${devTasks.length} tasks completed)`,
                inline: true
            });
        }

        await interaction.editReply({ 
            embeds: [userEmbed]
        });
    }
};