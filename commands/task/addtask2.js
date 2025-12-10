const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const Task2 = require("../../models/task2.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("addtask2")
        .setDescription("Create a new task")
        .addStringOption(o => 
            o.setName("title")
             .setDescription("Title of the task")
             .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("description")
             .setDescription("Describe the task")
             .setRequired(true)
        )
        // OPTIONAL FIELDS
        .addStringOption(o =>
            o.setName("resolution")
             .setDescription("Resolution (graphics only)")
             .setRequired(false)
        )
        .addStringOption(o =>
            o.setName("fileformat")
             .setDescription("File format (graphics only)")
             .setRequired(false)
        )
        .addStringOption(o =>
            o.setName("notes")
             .setDescription("Extra notes (graphics only)")
             .setRequired(false)
        )
        .addStringOption(o =>
            o.setName("deadline")
             .setDescription("Deadline for this task")
             .setRequired(false)
        )
        .addStringOption(o =>
    o.setName("file_name_format")
     .setDescription("How should designers name their final file? (graphics only)")
     .setRequired(false)
)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const title = interaction.options.getString("title");
        const description = interaction.options.getString("description");

        // NEW OPTIONAL FIELDS
        const resolution = interaction.options.getString("resolution");
        const fileFormat = interaction.options.getString("fileformat");
        const notes = interaction.options.getString("notes");
        const deadline = interaction.options.getString("deadline");
        const fileNameFormat = interaction.options.getString("file_name_format");

        // TEAM DETECTION BASED ON CHANNEL
        let team = null;

        if (interaction.channelId === "1448189002057257093") {
            team = "graphic";
        } else if (interaction.channelId === "1448189025491091597") {
            team = "dev";
        } else {
            return interaction.reply({ 
                content: "❌ Use this in a graphic or dev task channel.",
                ephemeral: true
            });
        }

        // AUTO-ID GENERATION
        const latest = await Task2.findOne().sort({ createdAt: -1 });
        let next = 1;

        if (latest) {
            next = parseInt(latest.taskId.split("-")[1]) + 1;
        }

        const taskId = `tsk-${String(next).padStart(3, "0")}`;

        // CREATE TASK
        await Task2.create({
            taskId,
            title,
            description,
            team,
            createdBy: interaction.user.id,

            // GRAPHIC EXTRA FIELDS
            resolution: team === "graphic" ? resolution : null,
            fileFormat: team === "graphic" ? fileFormat : null,
            notes: team === "graphic" ? notes : null,
            fileNameFormat: team === "graphic" ? fileNameFormat : null,

            // BOTH TEAMS
            deadline: deadline || null
        });

        const embed = new EmbedBuilder()
            .setTitle("📝 New Task Created")
            .addFields(
                { name: "Task ID", value: taskId },
                { name: "Team", value: team },
                { name: "Title", value: title },
                { name: "Description", value: description },
                { name: "Deadline", value: deadline || "None" }
            )
            .setColor(team === "graphic" ? "Purple" : "Blue")
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};