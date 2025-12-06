// systems/reputation.js
//--------------------------------------------------
// Reputation System Main File
//--------------------------------------------------

const Reputation = require("../models/reputation.js");
const RepBan = require("../models/repban.js");
const { PermissionsBitField, Events } = require("discord.js");

// Words
const THANK_WORDS = ["ty", "thank", "thanks", "thx", "thnx"];
const WELCOME_WORDS = ["yw", "welcome", "np", "noworries", "noproblem", "nw", "nws"];

// Disabled areas
const DISABLED_CHANNELS = ["1129785430326394892"];
const DISABLED_CATEGORIES = ["1330029371934773268"];

// Tier roles
const ROLE_BEGINNER = "1114823569864663092";
const ROLE_INTERMEDIATE = "1114823925935902770";
const ROLE_ADVANCED = "1114823886438154240";
const ROLE_EXPERT = "1243606965482033193";
const ROLE_GIGACHAD = "1114823933674410034";

const TIERS = [
    { amount: 1000, role: ROLE_GIGACHAD, label: "Giga Chad (1000+ Rep)" },
    { amount: 500, role: ROLE_EXPERT, label: "Expert (500+ Rep)" },
    { amount: 100, role: ROLE_ADVANCED, label: "Advanced (100+ Rep)" },
    { amount: 50, role: ROLE_INTERMEDIATE, label: "Intermediate (50+ Rep)" },
    { amount: 10, role: ROLE_BEGINNER, label: "Beginner (10+ Rep)" },
];
const ALL_TIER_IDS = TIERS.map(t => t.role);

//---------------------------------------------
// Helper: token split
//---------------------------------------------
function splitTokens(text) {
    return (text || "").toLowerCase().split(/\s+/).filter(Boolean);
}

function hasWholeWord(str, list) {
    if (!str) return false;
    const tokens = splitTokens(str);
    return tokens.some(t => list.includes(t));
}

//---------------------------------------------
// DB Helpers
//---------------------------------------------
async function getRepRecord(userId) {
    let doc = await Reputation.findOne({ userId });
    if (!doc) doc = await Reputation.create({ userId, rep: 0 });
    return doc;
}

async function addReputation(userId) {
    if (await RepBan.findOne({ userId })) return null;
    const doc = await getRepRecord(userId);
    doc.rep += 1;
    await doc.save();
    return doc.rep;
}

//---------------------------------------------
// Tier Sync Logic
//---------------------------------------------
async function ensureTierRoleAndCheckAdded(guild, member, announceChannel) {
    try {
        member = await guild.members.fetch(member.id).catch(() => member);
        if (!member) return false;

        if (await RepBan.findOne({ userId: member.id })) return false;

        const me = guild.members.me;
        if (!me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return false;

        const repDoc = await getRepRecord(member.id);
        const rep = repDoc.rep ?? 0;

        const eligible = TIERS.find(t => rep >= t.amount);

        if (!eligible) {
            await member.roles.remove(ALL_TIER_IDS).catch(() => {});
            return false;
        }

        const hadBefore = member.roles.cache.has(eligible.role);

        const toRemove = ALL_TIER_IDS.filter(r => r !== eligible.role);
        await member.roles.remove(toRemove).catch(() => {});

        if (!hadBefore) {
            await member.roles.add(eligible.role).catch(() => {});

            if (announceChannel) {
                announceChannel.send(
                    `🎉 Congratulations, ${member} has received the **${eligible.label}** role!`
                ).catch(() => {});
            }

            return true;
        }

        return false;
    } catch (err) {
        console.error("[Reputation] ensureTierRole ERROR:", err);
        return false;
    }
}

//---------------------------------------------
// MAIN EXPORT — attaches event listeners
//---------------------------------------------
module.exports = function reputationSystem(client) {
    
    const processedMessageIds = new Set();

    client.on(Events.MessageCreate, async (message) => {
        try {
            if (!message.guild) return;
            if (message.author.bot) return;

            // Disable checks
            if (DISABLED_CHANNELS.includes(message.channel.id)) return;
            if (message.channel.parentId && DISABLED_CATEGORIES.includes(message.channel.parentId)) return;

            const content = message.content?.toLowerCase() || "";
            if (processedMessageIds.has(message.id)) return;

            // ---------- CASE 1: thank reply ----------
            if (message.reference && hasWholeWord(content, THANK_WORDS)) {
                const replied = await message.fetchReference().catch(() => null);
                const target = replied?.member;
                if (!target) return;
                if (target.id === message.author.id) return;

                const newRep = await addReputation(target.id);
                if (newRep === null) return;

                processedMessageIds.add(message.id);
                await ensureTierRoleAndCheckAdded(message.guild, target, message.channel);

                return message.channel.send(`+1 Rep → ${target} (**${newRep}**)`);
            }

            // ---------- CASE 2: thank @members ----------
            if (!message.reference && hasWholeWord(content, THANK_WORDS) && message.mentions.members.size) {
                let processed = new Set();
                let awarded = false;

                for (const m of message.mentions.members.values()) {
                    if (!m || m.id === message.author.id) continue;
                    if (processed.has(m.id)) continue;

                    const newRep = await addReputation(m.id);
                    if (newRep === null) continue;

                    processed.add(m.id);
                    awarded = true;

                    await ensureTierRoleAndCheckAdded(message.guild, m, message.channel);
                    await message.channel.send(`+1 Rep → ${m} (**${newRep}**)`);
                }

                if (awarded) processedMessageIds.add(message.id);
                return;
            }

            // ---------- CASE 3: yw reply to a thank ----------
            if (message.reference && hasWholeWord(content, WELCOME_WORDS)) {
                const replied = await message.fetchReference().catch(() => null);
                if (!replied) return;
                if (!hasWholeWord(replied.content?.toLowerCase(), THANK_WORDS)) return;

                const newRep = await addReputation(message.author.id);
                if (newRep === null) return;

                processedMessageIds.add(message.id);

                await ensureTierRoleAndCheckAdded(message.guild, message.member, message.channel);
                return message.channel.send(`+1 Rep → ${message.author} (**${newRep}**)`);
            }

        } catch (err) {
            console.error("[Reputation] Message Handler Error:", err);
        }
    });

    console.log("✅ Reputation system loaded");
};