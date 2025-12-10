const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatBoard } = require('../../utils/formatter.js');
const TaskBoard = require('../../models/task.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('task')
        .setDescription('Create a taskboard with multiple tasks')
        .addStringOption(option =>
            option
                .setName('for')
                .setDescription('Select team')
                .setRequired(true)
                .addChoices(
                    { name: 'Developer', value: 'dev' },
                    { name: 'Graphic Designer', value: 'graphic' }
                )
        )
        .addStringOption(option =>
            option
                .setName('description')
                .setDescription('Write tasks like: 1. First Task 2. Second Task 3. Third Task')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('deadline')
                .setDescription('Format: dd/mm/yyyy. Deadline for Graphic team.')
                .setRequired(false)
        ),


    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });  

        const team = interaction.options.getString('for');
        const description = interaction.options.getString('description');
        const deadline = interaction.options.getString('deadline');

        // Extract tasks formatted like "1. Task A 2. Task B 3. Task C"
        const matches = description.match(/\d+\s*[\.\-\)]\s*[^0-9]+(?=\d+\s*[\.\-\)]|$)/g) || [];

        if (matches.length === 0) {
            return interaction.reply({
                content: "❌ Please format tasks like: `1. First Task 2. Second Task 3. Third Task`",
                ephemeral: true
            });
        }

        // Generate board ID like DEV1, GFX3, etc.
        const prefix = team === 'dev' ? 'DEV' : 'GFX';
        const existingCount = await TaskBoard.countDocuments({ team });
        const boardId = `${prefix}${existingCount + 1}`;

        // Create board object
        const tasks = [];

        for (let i = 0; i < matches.length; i++) {
            const cleaned = matches[i]
                .replace(/^\d+\s*[\.\-\)]\s*/, "")
                .trim();

            tasks.push({
                number: i + 1,
                description: cleaned,
                status: team === 'dev' ? 'Unclaimed' : undefined,
                deadline: team === 'graphic' ? (deadline || 'None') : undefined
            });
        }

        // Save board in database
        const board = await TaskBoard.create({
            boardId,
            team,
            channelId: interaction.channel.id,
            messageId: null,
            tasks
        });

        // Format board 
        const embed = new EmbedBuilder()
            .setTitle(`${team === 'dev' ? 'Developer' : 'Graphic'} Taskboard`)
            .setColor('Blue')
            .setDescription(
                `**Board ID:** ${boardId}\n\n` +
                formatBoard(tasks, team)
            );

        // Send taskboard visibly in the channel
        const sent = await interaction.channel.send({ embeds: [embed] });

        // Save message ID
        board.messageId = sent.id;
        await board.save();
         
        await interaction.editReply({
            content: `✅ Taskboard created successfully!`
        });

    }
};





