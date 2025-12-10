const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Task2 = require("../../models/task2.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("myprogress")
        .setDescription("View your graphic design progress and certificate status"),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const userId = interaction.user.id;
        
        // CHECK IF IN GRAPHICS CHANNEL
        if (interaction.channelId !== "1448189002057257093") {
            return interaction.editReply("❌ This command is for graphics team only.");
        }

        const tasks = await Task2.find({ team: "graphic" });
        
        // INDIVIDUAL STATS
        const myClaimedTasks = tasks.filter(t => t.assignedTo.includes(userId));
        const myFinishedTasks = tasks.filter(t => t.finishedBy.includes(userId));
        const mySelectedTasks = tasks.filter(t => t.selected === userId);

        // Calculate certificate progress (5 finished designs = certificate)
        const certificateProgress = Math.min(myFinishedTasks.length, 5);
        const stars = "⭐".repeat(certificateProgress) + "☆".repeat(5 - certificateProgress);

        const embed = new EmbedBuilder()
            .setTitle(`🎨 Your Graphic Design Progress`)
            .setColor("Purple")
            .setDescription(
                `**Designer: <@${userId}>**\n` +
                `Keep submitting designs to earn your certificate!`
            )
            .addFields(
                { 
                    name: "📝 Total Team Tasks", 
                    value: String(tasks.length), 
                    inline: true 
                },
                { 
                    name: "🎨 Tasks You Claimed", 
                    value: String(myClaimedTasks.length), 
                    inline: true 
                },
                { 
                    name: "✅ Designs You Finished", 
                    value: String(myFinishedTasks.length), 
                    inline: true 
                },
                { 
                    name: "🏆 Certificate Progress", 
                    value: `${stars} (${certificateProgress}/5 finished designs)`,
                    inline: false 
                }
            )
            .setFooter({ 
                text: `Submit ${5 - certificateProgress} more designs to earn your certificate!` 
            });

        // Show list of finished designs if any
        if (myFinishedTasks.length > 0) {
            const finishedList = myFinishedTasks
                .map(t => `• **${t.taskId}** - ${t.title}`)
                .join('\n')
                .substring(0, 500); // Limit length
            
            embed.addFields({
                name: "📋 Your Finished Designs",
                value: finishedList || "None yet",
                inline: false
            });
        }

        return interaction.editReply({ embeds: [embed] });
    }
};
