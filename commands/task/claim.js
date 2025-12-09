const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const TaskBoard = require('../../models/task.js');
const { formatBoard } = require('../../utils/formatter.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claim')
        .setDescription('Claim a task from a taskboard')
        .addStringOption(option =>
            option
                .setName('boardid')
                .setDescription('Board ID (e.g., DEV12 or GFX3)')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('tasknumber')
                .setDescription('Task number to claim')
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const boardId = interaction.options.getString('boardid').toUpperCase();
        const taskNumber = interaction.options.getInteger('tasknumber');
        const userId = interaction.user.id;
        const username = interaction.user.username;

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
                content: `❌ Task **${taskNumber}** is already marked as **Completed**. You cannot claim it.`
            });
        }

        // Check if task is already claimed
        if (task.status === 'Claimed') {
            return interaction.editReply({
                content: `❌ Task **${taskNumber}** is already claimed by someone else.`
            });
        }

        // Check if user already has a claimed task on this board
        const userHasClaimed = board.tasks.some(t => 
            t.status !== 'Completed' && t.claimedBy === userId
        );

        if (userHasClaimed) {
            return interaction.editReply({
                content: `❌ You already have a claimed task on board **${boardId}**. Finish it before claiming another.`
            });
        }

        // Update task status
        task.status = 'Claimed';
        task.claimedBy = userId;
        task.claimedAt = new Date();
        task.claimerName = username;

        await board.save();

        // Update the embed message
        const updatedEmbed = new EmbedBuilder()
            .setTitle(`${board.team === 'dev' ? 'Developer' : 'Graphic'} Taskboard`)
            .setColor('Green') // Changed color to indicate claimed status
            .setDescription(
                `**Board ID:** ${board.boardId}\n\n` +
                formatBoard(board.tasks, board.team, board.boardId)
            )
            .setFooter({ text: `Task ${taskNumber} claimed by ${username}` });

        try {
            const channel = await interaction.client.channels.fetch(board.channelId);
            const msg = await channel.messages.fetch(board.messageId);
            await msg.edit({ embeds: [updatedEmbed] });

            await interaction.editReply({
                content: `✅ Successfully claimed **Task ${taskNumber}** on board **${boardId}**!`
            });

        } catch (err) {
            console.error(err);
            await interaction.editReply({
                content: `✅ Task claimed in database, but couldn't update the message. Error: ${err.message}`
            });
        }
    }
};