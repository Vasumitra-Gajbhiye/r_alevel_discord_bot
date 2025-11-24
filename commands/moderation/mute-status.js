const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");
const ModLog = require("../../models/modlog.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mute-status")
        .setDescription("Check how long a user is muted for and why")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("User to check")
                .setRequired(true)
        ),

    async execute(interaction) {
        const modRoles = process.env.MOD_ROLES.split(",");

        if (!interaction.member.roles.cache.some(r => modRoles.includes(r.id))) {
            return interaction.reply({
                content: "❌ You are not allowed to use this command.",
                flags: 64
            });
        }

        const member = interaction.options.getMember("user");

        if (!member) {
            return interaction.reply({
                content: "❌ User not found in this server.",
                flags: 64
            });
        }

        // ------------------------------
        // 1️⃣ CHECK DISCORD MUTE STATUS
        // ------------------------------
        const muteUntil = member.communicationDisabledUntilTimestamp;

        if (!muteUntil || muteUntil < Date.now()) {
            return interaction.reply({
                content: `🔊 **${member.user.tag}** is **not currently muted**.`,
                flags: 64
            });
        }

        // Time remaining
        const remainingMs = muteUntil - Date.now();
        const remainingMinutes = Math.floor(remainingMs / 60000);
        const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);

        // ---------------------------------------
        // 2️⃣ FETCH MUTE INFO FROM modlogs
        // Find latest "mute" log BEFORE the unmute log (if exists)
        // ---------------------------------------
        const allLogs = await ModLog.find({ userId: member.id }).sort({ timestamp: -1 });

        // Latest mute entry
        const lastMute = allLogs.find(log => log.action === "mute");

        // Latest unmute entry (if exists)
        const lastUnmute = allLogs.find(log => log.action === "unmute");

        // If there is an unmute newer than mute → invalid mute
        if (lastUnmute && lastMute && lastUnmute.timestamp > lastMute.timestamp) {
            return interaction.reply({
                content: `🔊 **${member.user.tag}** is not muted.`,
                flags: 64
            });
        }

        if (!lastMute) {
            // Muted on Discord but no DB log (rare)
            return interaction.reply({
                content: `⚠️ User is muted but **no mute log exists** in the database.`,
                flags: 64
            });
        }

        // Format remaining time nicely
        const remainingFormatted =
            remainingMinutes > 0
                ? `${remainingMinutes}m ${remainingSeconds}s`
                : `${remainingSeconds}s`;

        // ---------------------------------------
        // 3️⃣ BUILD EMBED RESPONSE
        // ---------------------------------------
        const embed = new EmbedBuilder()
            .setTitle(`🔇 Mute Status — ${member.user.tag}`)
            .setColor("Blurple")
            .addFields(
                {
                    name: "🔹 Muted Until",
                    value: `<t:${Math.floor(muteUntil / 1000)}:F>`,
                    inline: false
                },
                {
                    name: "⏳ Time Remaining",
                    value: `**${remainingFormatted}**`,
                    inline: false
                },
                {
                    name: "📝 Reason",
                    value: lastMute.reason,
                    inline: false
                },
                {
                    name: "🆔 Action ID",
                    value: `\`${lastMute.actionId}\``,
                    inline: false
                },
                {
                    name: "📅 Muted At",
                    value: `<t:${Math.floor(lastMute.timestamp / 1000)}:F>`,
                    inline: false
                }
            )
            .setFooter({ text: "Mute information pulled from modlogs + Discord timeout status." });

        return interaction.reply({ embeds: [embed] });
    }
};