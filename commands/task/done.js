const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const TaskBoard = require('../../models/task.js');
const { formatBoard } = require('../../utils/formatter.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('done')
        .setDescription('Mark a task as completed (Moderators only)')
        .addStringOption(option =>
            option
                .setName('boardid')
                .setDescription('Board ID (e.g., DEV12 or GFX3)')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('tasknumber')
                .setDescription('Task number to mark as done')
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const boardId = interaction.options.getString('boardid').toUpperCase();
        const taskNumber = interaction.options.getInteger('tasknumber');

        // Find the board
        const board = await TaskBoard.findOne({ boardId });
        
        if (!board) {
            return interaction.editReply({
                content: `⚠️ Board **${boardId}** not found.`
            });
        }

        // Check if task exists
        if (taskNumber > board.tasks.length) {
            return interaction.editReply({
                content: `⚠️ Task **${taskNumber}** doesn't exist on board **${boardId}**. This board has only ${board.tasks.length} tasks.`
            });
        }

        const task = board.tasks[taskNumber - 1];

        // Check if task is already completed
        if (task.status === 'Completed') {
            return interaction.editReply({
                content: `⚠️ Task **${taskNumber}** is already marked as **Completed**.`
            });
        }

        // Update task status
        const previousStatus = task.status;
        const previousClaimer = task.claimerName || 'Unknown';
        
        task.status = 'Completed';
        task.completedAt = new Date();
        task.completedBy = interaction.user.id;
        task.completerName = interaction.user.username;
        task.actualWorker = task.claimedBy;

        await board.save();

        // Update the embed message
        const updatedEmbed = new EmbedBuilder()
            .setTitle(`${board.team === 'dev' ? 'Developer' : 'Graphic'} Taskboard`)
            .setColor('Gold') // Changed color to indicate completed status
            .setDescription(
                `**Board ID:** ${board.boardId}\n\n` +
                formatBoard(board.tasks, board.team, board.boardId)
            )
            .setFooter({ 
                text: `Task ${taskNumber} marked completed by ${interaction.user.username}'}` 
            });

        try {
            const channel = await interaction.client.channels.fetch(board.channelId);
            const msg = await channel.messages.fetch(board.messageId);
            await msg.edit({ embeds: [updatedEmbed] });

            await interaction.editReply({
                content: `✅ Successfully marked **Task ${taskNumber}** on board **${boardId}** as **Completed**!`
            });

        } catch (err) {
            console.error(err);
            await interaction.editReply({
                content: `✅ Task marked as completed in database, but couldn't update the message. Error: ${err.message}`
            });
        }
    }
};