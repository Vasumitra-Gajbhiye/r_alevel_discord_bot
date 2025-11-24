const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const ModLog = require("../../models/modlog.js");
const generateActionId = require("../../utils/generateId.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a user from the server")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("User to ban")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("reason")
                .setDescription("Reason for ban")
                .setRequired(true)
        ),

    async execute(interaction) {
        const modRoles = process.env.MOD_ROLES.split(",");
        if (!interaction.member.roles.cache.some(r => modRoles.includes(r.id))) {
            return interaction.reply({ content: "❌ You cannot use this command.", ephemeral: true });
        }

        const member = interaction.options.getMember("user");
        const reason = interaction.options.getString("reason");

        if (!member)
            return interaction.reply({ content: "❌ User not found.", ephemeral: true });

        // Prevent mods banning other mods
        if (member.roles.highest.position >= interaction.member.roles.highest.position)
            return interaction.reply({ content: "❌ You cannot ban this user.", ephemeral: true });

        // DM user
        try {
            await member.send(`🚫 You have been **banned** from **r/Alevel**.\nReason: ${reason}`);
        } catch {}

        // Ban the user
        try {
            await member.ban({ reason });
        } catch {
            return interaction.reply({ content: "❌ I do not have permission to ban this user.", ephemeral: true });
        }

        // Log to DB
        const actionId = generateActionId();
        await ModLog.create({
            userId: member.id,
            moderatorId: interaction.user.id,
            action: "ban",
            targetTag: member.user.tag,
            reason,
            actionId,
            targetChannel: null
        });

        const embed = new EmbedBuilder()
            .setTitle("🔨 User Banned")
            .setColor("#ff0000")
            .addFields(
                { name: "User", value: `${member.user.tag} (${member.id})` },
                { name: "Moderator", value: interaction.user.tag },
                { name: "Reason", value: reason },
                { name: "Action ID", value: actionId }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};