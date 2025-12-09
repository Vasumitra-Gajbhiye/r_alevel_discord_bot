const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const TaskBoard = require('../../models/task.js');
const { formatStatusTable} = require('../../utils/formatter.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('View status of claimed/completed tasks on a board')
        .addStringOption(option =>
            option
                .setName('boardid')
                .setDescription('Board ID (e.g., DEV12 or GFX3)')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });

        const boardId = interaction.options.getString('boardid').toUpperCase();
        const board = await TaskBoard.findOne({ boardId });
        
        if (!board) {
            return interaction.editReply({
                content: `⚠️ Board **${boardId}** not found.`
            });
        }

        // Get claimed and completed tasks
        const activeTasks = board.tasks.filter(task => 
            task.status === 'Claimed' || task.status === 'Completed'
        );

        if (activeTasks.length === 0) {
            return interaction.editReply({
                content: `📭 No tasks have been claimed or completed on board **${boardId}** yet.`
            });
        }

        // Format table using your style
        const statusTable = formatStatusTable(activeTasks, board.team);

        // Create embed
        const statusEmbed = new EmbedBuilder()
            .setTitle(`📊 Task Status - ${boardId}`)
            .setColor(board.team === 'dev' ? 'Blue' : 'Purple')
            .setDescription(`**${board.team === 'dev' ? 'Developer' : 'Graphic Designer'} Task Board**`)
            .addFields(
                { 
                    name: `Active Tasks (${activeTasks.length})`, 
                    value: statusTable || 'No active tasks', 
                    inline: false 
                }
            )
            .setFooter({ 
                text: `${board.team === 'dev' ? '👨‍💻 Developer Team' : '🎨 Graphic Team'}`
            });

        await interaction.editReply({ 
            embeds: [statusEmbed]
        });
    }
};