const { SlashCommandBuilder } = require("discord.js");
const ModLog = require("../../models/modlog.js");

function isModerator(member) {
    const allowedRoles = process.env.MOD_ROLES.split(",");
    return member.roles.cache.some(role => allowedRoles.includes(role.id));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("delwarn")
        .setDescription("Delete a specific warning by its action ID")
        .addStringOption(opt => opt
            .setName("actionid")
            .setDescription("Action ID of the warning")
            .setRequired(true)),

    async execute(interaction) {

        if (!isModerator(interaction.member))
            return interaction.reply({ content: "❌ No permission.", ephemeral: true });

        const actionId = interaction.options.getString("actionid");

        const deleted = await ModLog.findOneAndDelete({ actionId });

        if (!deleted)
            return interaction.reply({ content: "❌ No warning found with that ID.", ephemeral: true });

        return interaction.reply(`🗑️ Warning **${actionId}** deleted.`);
    }
};