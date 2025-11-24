const { SlashCommandBuilder } = require("discord.js");
const ModLog = require("../../models/modlog.js");

function isModerator(member) {
    const allowedRoles = process.env.MOD_ROLES.split(",");
    return member.roles.cache.some(role => allowedRoles.includes(role.id));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clearwarns")
        .setDescription("Clear all warnings for a user")
        .addUserOption(opt => opt
            .setName("user")
            .setDescription("User whose warnings should be cleared")
            .setRequired(true)),

    async execute(interaction) {

        if (!isModerator(interaction.member))
            return interaction.reply({ content: "❌ No permission.", ephemeral: true });

        const user = interaction.options.getUser("user");

        const result = await ModLog.deleteMany({ userId: user.id, action: "warn" });

        return interaction.reply(`🧹 Cleared **${result.deletedCount}** warnings for <@${user.id}>.`);
    }
};