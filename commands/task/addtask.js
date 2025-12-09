const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const TaskBoard = require('../../models/task.js');
const { formatBoard } = require('../../utils/formatter.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-task')
        .setDescription('Append tasks onto an existing Taskboard')
        .addStringOption(option =>
            option
                .setName('boardid')
                .setDescription('For example: DEV12 or GFX3')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('tasks')
                .setDescription('Write tasks like:\n1. First Task\n2. Second Task\n3. Third Task')
                .setRequired(true)
        ),

    async execute(interaction) {
        // Defer the reply first
        await interaction.deferReply({ ephemeral: true });

        const boardId = interaction.options.getString("boardid");
        const newTaskText = interaction.options.getString("tasks");

        // Correct model lookup
        const board = await TaskBoard.findOne({ boardId });

        if (!board) {
            await interaction.editReply("⚠️ Board not found.");
            return;
        }

        // Parse tasks
        const newTasksRaw = newTaskText
            .split("\n")
            .map(t => t.trim())
            .filter(t => t.length > 0);

        // Remove "1. " etc.
        const cleanedNewTasks = newTasksRaw.map(t =>
            t.replace(/^\d+\s*[\.\-\)]\s*/, "")
        );

        const startIndex = board.tasks.length + 1;

        const numberedNewTasks = cleanedNewTasks.map(
            (task, i) => ({
                number: startIndex + i,
                description: task,
                status: board.team === "dev" ? "Unclaimed" : undefined,
                deadline: board.team === "graphic" ? "None" : undefined
            })
        );

        // Append to DB
        board.tasks.push(...numberedNewTasks);
        await board.save();

        // Create embed using EmbedBuilder
        const updatedEmbed = new EmbedBuilder()
            .setTitle(`${board.team === 'dev' ? 'Developer' : 'Graphic'} Taskboard`)
            .setColor('Blue')
            .setDescription(
                `**Board ID:** ${board.boardId}\n\n` +
                formatBoard(board.tasks, board.team, board.boardId)
            );

        try {
            const channel = await interaction.client.channels.fetch(board.channelId);
            const msg = await channel.messages.fetch(board.messageId);

            await msg.edit({ embeds: [updatedEmbed] });

            // Send success message
            await interaction.editReply({
                content: `✅ Tasks added successfully to board ${boardId}!`
            });

        } catch (err) {
            console.error(err);
            await interaction.editReply("⚠️ Failed to update the board message.");
            return;
        }
    }
};



