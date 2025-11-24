// reputation-index.js
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");

// DB models & connect
const connectDB = require("./database.js");
const Reputation = require("./models/reputation.js");
const RepBan = require("./models/repban.js");
connectDB();

// Discord
const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  ActivityType,
  PermissionsBitField,
} = require("discord.js");

// ---------- CONFIG ----------
const BOT_ID = "1127197280651464714"; // keep your bot id here

// whole-word keywords
const THANK_WORDS = ["ty", "thank", "thanks", "thx", "thnx"];
const WELCOME_WORDS = ["yw", "welcome", "np", "noworries", "noproblem", "nw", "nws"];

// Channels where rep system is disabled
const DISABLED_CHANNELS = [
  "1129785430326394892"
];

// Categories where rep system is disabled
const DISABLED_CATEGORIES = [
  "1330029371934773268"
];

// role ids (set these to your real role ids)
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

// ---------- CLIENT ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// optional: load slash commands if you have them in ./commands (kept minimal)
const commandsFolder = path.join(__dirname, "commands");
if (fs.existsSync(commandsFolder)) {
  for (const folder of fs.readdirSync(commandsFolder)) {
    const p = path.join(commandsFolder, folder);
    if (!fs.statSync(p).isDirectory()) continue;
    for (const f of fs.readdirSync(p).filter(x => x.endsWith(".js"))) {
      const cmd = require(path.join(p, f));
      if (cmd.data && cmd.execute) client.commands.set(cmd.data.name, cmd);
    }
  }
}

// ---------- HELPERS ----------
function splitTokens(text) {
  return (text || "").toLowerCase().split(/\s+/).filter(Boolean);
}
function hasWholeWord(text, list) {
  if (!text) return false;
  const tokens = splitTokens(text);
  return tokens.some(t => list.includes(t));
}

async function getRepRecord(userId) {
  let doc = await Reputation.findOne({ userId });
  if (!doc) doc = await Reputation.create({ userId, rep: 0 });
  return doc;
}

async function addReputation(userId) {
  const banned = await RepBan.findOne({ userId });
  if (banned) return null;
  const doc = await getRepRecord(userId);
  doc.rep += 1;
  await doc.save();
  return doc.rep;
}

/**
 * Ensure member has exactly the highest applicable tier role.
 * Returns true if a new tier role was ADDED (i.e. user crossed into new tier).
 */
async function ensureTierRoleAndCheckAdded(guild, member, channelForAnnouncement) {
  try {
    // refresh
    member = await guild.members.fetch(member.id).catch(() => member);
    if (!member) return false;

    // repban check
    if (await RepBan.findOne({ userId: member.id })) return false;

    // bot permissions
    const me = guild.members.me;
    if (!me || !me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      console.warn("[rep] Missing ManageRoles permission");
      return false;
    }

    // fetch rep and eligible tier
    const repDoc = await getRepRecord(member.id);
    const rep = repDoc.rep ?? 0;
    const eligible = TIERS.find(t => rep >= t.amount);

    // if no eligible tier, remove tier roles and exit
    if (!eligible) {
      await member.roles.remove(ALL_TIER_IDS).catch(() => {});
      return false;
    }

    // Was the eligible role present BEFORE any changes?
    const hadEligibleBefore = member.roles.cache.has(eligible.role);

    // Remove other tier roles (but don't remove eligible if present)
    const toRemove = ALL_TIER_IDS.filter(id => id !== eligible.role);
    if (toRemove.length) await member.roles.remove(toRemove).catch(() => {});

    // If already had eligible role nothing else to do
    if (hadEligibleBefore) return false;

    // Add eligible role (user just reached the tier)
    await member.roles.add(eligible.role).catch(err => {
      console.error("[rep] Failed to add role:", err);
    });

    // Announce in `channelForAnnouncement` if provided
    if (channelForAnnouncement) {
      channelForAnnouncement.send(`🎉 Congratulations, ${member} has received the **${eligible.label}** role!`).catch(() => {});
    }

    return true; // role added now
  } catch (err) {
    console.error("[rep|ensureTierRole] Error:", err);
    return false;
  }
}

// ---------- Idempotency: processed message ids ----------
// We store message IDs that already caused rep awarding to avoid duplicate outputs
// This is in-memory (restart clears) which is fine for your use-case.
const processedMessageIds = new Set();

// ---------- READY ----------
client.once(Events.ClientReady, () => {
  console.log("✅ Reputation handler online");
  client.user.setActivity({ name: "Helping r/Alevel study", type: ActivityType.Watching });
});

// ---------- MESSAGE HANDLER ----------
client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.guild) return;
    if (message.author.bot) return;
    if (message.author.id === BOT_ID) return;
    // --- Reputation Disabled Checks ---
const channelId = message.channel.id;
const categoryId = message.channel.parentId;

// block specific channels
if (DISABLED_CHANNELS.includes(channelId)) return;

// block whole categories
if (categoryId && DISABLED_CATEGORIES.includes(categoryId)) return;

    const content = (message.content || "").toLowerCase();

    // already processed?
    if (processedMessageIds.has(message.id)) return;

    // -------------- CASE 1: Reply saying 'thank' => award the author of replied message --------------
    if (message.reference && hasWholeWord(content, THANK_WORDS)) {
      const replied = await message.fetchReference().catch(() => null);
      const targetMember = replied?.member;
      if (!targetMember) return;
      if (targetMember.id === message.author.id) return; // no self-award

      const newRep = await addReputation(targetMember.id);
      if (newRep === null) return; // repbanned

      // mark processed so we don't act twice for the same message
      processedMessageIds.add(message.id);

      // assign role and announce only if newly added
      await ensureTierRoleAndCheckAdded(message.guild, targetMember, message.channel);

      // visible rep message in same channel
      await message.channel.send(`+1 Rep → ${targetMember} (**${newRep}**)`).catch(() => {});
      return;
    }

    // -------------- CASE 2: 'thank @user' not a reply => award each mentioned member (unique) --------------
    if (!message.reference && hasWholeWord(content, THANK_WORDS) && message.mentions?.members?.size) {
      const processed = new Set();
      let someoneAwarded = false;

      for (const m of message.mentions.members.values()) {
        if (!m) continue;
        if (m.id === message.author.id) continue; // no self-award
        if (m.id === BOT_ID) continue; // no bot
        if (processed.has(m.id)) continue;

        const newRep = await addReputation(m.id);
        if (newRep === null) continue; // repbanned

        processed.add(m.id);
        someoneAwarded = true;

        // assign role and announce only if newly added
        await ensureTierRoleAndCheckAdded(message.guild, m, message.channel);

        // visible rep message per member
        await message.channel.send(`+1 Rep → ${m} (**${newRep}**)`).catch(() => {});
      }

      if (someoneAwarded) processedMessageIds.add(message.id);
      return;
    }

    // -------------- CASE 3: Reply "yw"/"np" to a Thank message => award the reply author --------------
    if (message.reference && hasWholeWord(content, WELCOME_WORDS)) {
      const replied = await message.fetchReference().catch(() => null);
      if (!replied) return;
      // Only if the replied message was a thank (whole-word)
      if (!hasWholeWord(replied.content?.toLowerCase() || "", THANK_WORDS)) return;

      const newRep = await addReputation(message.author.id);
      if (newRep === null) return; // repbanned

      processedMessageIds.add(message.id);
      await ensureTierRoleAndCheckAdded(message.guild, message.member, message.channel);
      return void message.channel.send(`+1 Rep → ${message.author} (**${newRep}**)`).catch(() => {});
    }

  } catch (err) {
    console.error("[Reputation] Message handler error:", err);
  }
});

// ---------- INTERACTIONS (slash commands) ----------
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error("[Reputation] Command error:", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "⚠️ Error executing command.", ephemeral: true });
    }
  }
});

// ---------- LOGIN ----------
client.login(process.env.TOKEN);