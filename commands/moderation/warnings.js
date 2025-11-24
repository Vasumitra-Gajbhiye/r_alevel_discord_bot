const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const ModLog = require("../../models/modlog.js");

function isModerator(member) {
    const allowedRoles = process.env.MOD_ROLES.split(",");
    return member.roles.cache.some(role => allowedRoles.includes(role.id));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("warnings")
        .setDescription("View all warnings of a user")
        .addUserOption(opt => opt
            .setName("user")
            .setDescription("User to check warnings for")
            .setRequired(true)
        ),

    async execute(interaction) {
        if (!isModerator(interaction.member)) {
            return interaction.reply({ content: "❌ You do not have permission to use this command.", ephemeral: true });
        }

        const user = interaction.options.getUser("user");

        // Fetch only WARN entries for that user
        const logs = await ModLog.find({ userId: user.id, action: "warn" }).sort({ timestamp: -1 });

        if (logs.length === 0) {
            return interaction.reply({
                content: `✅ **${user.tag}** has no warnings.`,
                ephemeral: true
            });
        }

        // Build embed
        const embed = new EmbedBuilder()
            .setTitle(`⚠️ Warnings for ${user.tag}`)
            .setColor("Orange");

        for (const log of logs) {

            // Fetch moderator name
            let moderatorName = "Unknown Moderator";
            try {
                const modUser = await interaction.client.users.fetch(log.moderatorId);
                moderatorName = modUser?.tag || log.moderatorId;
            } catch {
                moderatorName = log.moderatorId; // fallback
            }

            embed.addFields({
                name: `🚨 Warning ID: ${log.actionId}`,
                value:
                    `**Moderator:** ${moderatorName}\n` +
                    `**Reason:** ${log.reason}\n` +
                    `**Date:** <t:${Math.floor(log.timestamp / 1000)}:F>`,
                inline: false
            });
        }

        return interaction.reply({ embeds: [embed] });
    }
};