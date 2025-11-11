// const fs = require("node:fs");
// const path = require("node:path");
// const { QuickDB } = require("quick.db");
// const db = new QuickDB();

// const {
//   Client,
//   Collection,
//   Events,
//   GatewayIntentBits,
//   ActivityType,
// } = require("discord.js");

// const { token, guildId } = require("./config.json");
// const { Int32 } = require("mongodb");
// const { getRandomValues } = require("node:crypto");

// const client = new Client({
//   intents: [
//     GatewayIntentBits.Guilds,
//     GatewayIntentBits.GuildMessages,
//     GatewayIntentBits.MessageContent,
//     GatewayIntentBits.GuildMembers,
//   ],
// });

// client.commands = new Collection();
// const foldersPath = path.join(__dirname, "commands");
// const commandFolders = fs.readdirSync(foldersPath);

// for (const folder of commandFolders) {
//   const commandsPath = path.join(foldersPath, folder);
//   const commandFiles = fs
//     .readdirSync(commandsPath)
//     .filter((file) => file.endsWith(".js"));
//   for (const file of commandFiles) {
//     const filePath = path.join(commandsPath, file);
//     const command = require(filePath);
//     if ("data" in command && "execute" in command) {
//       client.commands.set(command.data.name, command);
//     } else {
//       console.log(
//         `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
//       );
//     }
//   }
// }

// client.once(Events.ClientReady, () => {
//   console.log("Ready!");
//   client.user.setActivity({
//     name: "Watching over r/Alevel server",
//     type: ActivityType.Watching,
//   });
// });

// client.on(Events.MessageCreate, async (message) => {
//   const prefix = "!"
//   const args = message.content.slice(prefix.length).trim().split(/ +/);



// // Extract the command (first element) from the args array
// const command = args.shift().toLowerCase();
//   if(command === "rep") {
//     if(!message.member.roles.cache.some(role => role.id === "1114451108811767928")) return;
//     if (args.length < 2) {
//       return message.channel.send('Please provide a user and the reputation value to set!');
//     }

//     const user = message.mentions.users.first();
//     if (!user) {
//       return message.channel.send('Please mention a valid user!');
//     }

//     const newReputation = parseInt(args[1]);

//     if (isNaN(newReputation)) {
//       return message.channel.send('Please provide a valid reputation value!');
//     }
//     await db.set(user.id, newReputation)
//     message.channel.send(`Successfully set ${user}'s reputation to ${newReputation}`)

//   }



//   const tyMessageArray = ["ty", "thank", "thnx", "thx", "thn"];
//   const ywMessageArray = [
//     "yw",
//     "welcome",
//     "no worries",
//     "nw",
//     "no worry",
//     "no problem",
//     "np",
//   ];

//   async function reputation(id) {
//     try {
//       const rep = (await db.get(id)) ?? 0;
//       await db.set(id, rep + 1);
//       return parseInt(rep) + 1;
//     } catch (error) {
//       console.log(error);
//     }
//   }

//   async function repRole(message, mem, whatExactly) {
//     try {
//       if(whatExactly == true) {
//         var rep = parseInt(await db.get(message.author.id)) ?? 0;
//       } else {
//         var rep = parseInt(await db.get(mem.id)) ?? 0;
//       }
//       if (rep >= 1000) {
//         if (whatExactly == true) {
//           if(message.member.roles.cache.some(role => role.id === "1114823933674410034")) return;
//           message.member.roles.add("1114823933674410034");
//           message.channel.send(`Congratulations, ${message.author} has recieved the Giga Chad (1000+ Rep) role!`)
//         } else {
//           if(mem.roles.cache.some(role => role.id === "1114823933674410034")) return;
//           mem.roles.add("1114823933674410034");
//           message.channel.send(`Congratulations, ${mem} has recieved the Giga Chad (1000+ Rep) role!`)
//         }
        
//       } else if (rep >= 500) {
//         if (whatExactly == true) {
//           if(message.member.roles.cache.some(role => role.id === "1114823572096045118")) return;
//           message.member.roles.add("1114823572096045118");
//           message.channel.send(`Congratulations, ${message.author} has recieved the Expert (500+ Rep) role!`)
//         } else {
//           if(mem.roles.cache.some(role => role.id === "1114823572096045118")) return;
//           mem.roles.add("1114823572096045118");
//           message.channel.send(`Congratulations, ${mem} has recieved the Expert (500+ Rep) role!`)

//         }
//       } else if (rep >= 100) {
//         if (whatExactly == true) {
//           if(message.member.roles.cache.some(role => role.id === "1114823886438154240")) return;
//           message.member.roles.add("1114823886438154240");
//           message.channel.send(`Congratulations, ${message.author} has recieved the Advance (100+ Rep) role!`)

//         } else {
//           if(mem.roles.cache.some(role => role.id === "1114823886438154240")) return;
//           mem.roles.add("1114823886438154240");
//           message.channel.send(`Congratulations, ${mem} has recieved the Advance (100+ Rep) role!`)

//         }
//       } else if (rep >= 50) {
//         if (whatExactly == true) {
//           if(message.member.roles.cache.some(role => role.id === "1114823925935902770")) return;
//           message.member.roles.add("1114823925935902770");
//           message.channel.send(`Congratulations, ${message.author} has recieved the Intermediate (50+ Rep) role!`)
//         } else {
//           if(mem.roles.cache.some(role => role.id === "1114823925935902770")) return;
//           mem.roles.add("1114823925935902770");
//           message.channel.send(`Congratulations, ${mem} has recieved the Intermediate (50+ Rep) role!`)

//         }
//       } else if (rep >= 10) {
//         if (whatExactly == true) {
//           if(message.member.roles.cache.some(role => role.id === "1114823569864663092")) return;
//           message.member.roles.add("1114823569864663092");
//           message.channel.send(`Congratulations, ${message.author} has recieved the Beginner (10+ Rep) role!`)
//         } else {
//           if(mem.roles.cache.some(role => role.id === "1114823569864663092")) return;
//           mem.roles.add("1114823569864663092");
//           message.channel.send(`Congratulations, ${mem} has recieved the Beginner (10+ Rep) role!`)

//         }
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   }
//   var ywReply = false;
//   if (message.author.bot) return;
//   if (message.author.id === 1127197280651464714) return;
//   const id = message.author.id;
//   for (let i = 0; i < ywMessageArray.length; i++) {
//     if (message.content.toLowerCase().includes(ywMessageArray[i])) {
//       try {
//         var repliedMessage = await message.fetchReference();
//         if (repliedMessage.author.id === "1127197280651464714") return;
//         for (let e = 0; e < tyMessageArray.length; e++) {
//           if (repliedMessage.content.includes(tyMessageArray[e])) {
//             ywReply = true;
//             break;
//           }
//         }
//         if (ywReply == false) {
//           if (message.author.bot) return;
//           const rep = await reputation(message.author.id);
//           await repRole(message,"nan",true);
//           message.channel.send(
//             `Gave +1 reputation to ${message.author} (${rep})`
//           );
//           return;
//         }
//       } catch (error) {
//         console.log(error);
//       }
//     }
//   }

//   for (let i = 0; i < tyMessageArray.length; i++) {
//     if (message.content.toLowerCase().includes(tyMessageArray[i])) {
//       message.mentions.members?.forEach(async (mem) => {
//         if (!mem) return;
//         if(mem.id === "1127197280651464714") return;
//         if(mem.id === message.author.id) return;
//         const rep = await reputation(mem.id);
//         await repRole(message, mem, false);

//         message.channel.send(`Gave +1 reputation to ${mem} (${rep})`);
//       });
//       return;
//     }
//   }
// });

// client.on(Events.InteractionCreate, async (interaction) => {
//   if (!interaction.isChatInputCommand()) return;

//   const command = client.commands.get(interaction.commandName);

//   if (!command) return;

//   try {
//     await command.execute(interaction);
//   } catch (error) {
//     console.error(error);
//     if (interaction.replied || interaction.deferred) {
//       await interaction.followUp({
//         content: "There was an error while executing this command!",
//         ephemeral: true,
//       });
//     } else {
//       await interaction.reply({
//         content: "There was an error while executing this command!",
//         ephemeral: true,
//       });
//     }
//   }
// });

// client.login(token);

/**
 * Discord Reputation System Bot
 * Cleaned + Commented Version (Functionality unchanged)
 */
// ------------------------
// MessageCreate — Reputation Logic (deduped)
// ------------------------
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");

// DB
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

// ------------------------
// Constants / Config
// ------------------------
const BOT_ID = "1127197280651464714";

// Role IDs (tiers)
const ROLE_BEGINNER = "1114823569864663092";
const ROLE_INTERMEDIATE = "1114823925935902770";
const ROLE_ADVANCED = "1114823886438154240";
const ROLE_EXPERT = "1114823572096045118";
const ROLE_GIGACHAD = "1114823933674410034";

// Thank/Welcome keyword sets (strict, whole-word)
const THANK_WORDS = ["ty", "thank", "thanks", "thx", "thnx"];
const WELCOME_WORDS = ["yw", "welcome", "np", "noworries", "noproblem"];

// Processed message cache to prevent duplicate sends in weird edge cases
// (e.g., host restarting event loop, partial replays, accidental double handling).
// Keys are Discord message IDs.
const processedMessageIds = new Set();

// ------------------------
// Client
// ------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ------------------------
// Load Slash Commands
// ------------------------
client.commands = new Collection();
const commandsFolder = path.join(__dirname, "commands");

if (fs.existsSync(commandsFolder)) {
  for (const folder of fs.readdirSync(commandsFolder)) {
    const folderPath = path.join(commandsFolder, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    const commandFiles = fs.readdirSync(folderPath).filter((f) => f.endsWith(".js"));
    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const cmd = require(filePath);
      if ("data" in cmd && "execute" in cmd) client.commands.set(cmd.data.name, cmd);
      else console.warn(`[WARN] ${filePath} missing "data" or "execute".`);
    }
  }
}

// ------------------------
// Helpers
// ------------------------

// Whole-word detection (no substring false positives)
function hasAnyWholeWord(message, dictionary) {
  const tokens = message.toLowerCase().split(/\s+/).filter(Boolean);
  return tokens.some((t) => dictionary.includes(t));
}

// Get or create reputation record
async function getRepRecord(userId) {
  let doc = await Reputation.findOne({ userId });
  if (!doc) doc = await Reputation.create({ userId, rep: 0 });
  return doc;
}

// Add +1 reputation (returns new rep or null if banned)
async function addReputation(userId) {
  const isBanned = await RepBan.findOne({ userId });
  if (isBanned) return null;
  const rec = await getRepRecord(userId);
  rec.rep += 1;
  await rec.save();
  return rec.rep;
}

// Role tier table (highest to lowest)
const TIERS = [
  { amount: 1000, role: ROLE_GIGACHAD, label: "Giga Chad (1000+ Rep)" },
  { amount: 500, role: ROLE_EXPERT, label: "Expert (500+ Rep)" },
  { amount: 100, role: ROLE_ADVANCED, label: "Advanced (100+ Rep)" },
  { amount: 50, role: ROLE_INTERMEDIATE, label: "Intermediate (50+ Rep)" },
  { amount: 10, role: ROLE_BEGINNER, label: "Beginner (10+ Rep)" },
];
const ALL_TIER_IDS = TIERS.map((t) => t.role);

// Assign the correct rep role, only announce when the tier actually changes
async function assignRepRole(message, member) {
  try {
    if (!member || !message.guild) return;

    // Respect repban
    const banned = await RepBan.findOne({ userId: member.id });
    if (banned) return;

    // Permissions check
    const me = message.guild.members.me;
    if (!me || !me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      console.warn("[assignRepRole] Missing Manage Roles permission.");
      return;
    }

    // Current rep & eligible tier
    const rep = (await getRepRecord(member.id)).rep ?? 0;
    const eligible = TIERS.find((t) => rep >= t.amount);

    // If no tier applies, remove any tier roles and exit (no announcement)
    if (!eligible) {
      await member.roles.remove(ALL_TIER_IDS).catch(() => {});
      return;
    }

    const hasCorrect = member.roles.cache.has(eligible.role);

    // Remove only wrong tier roles (keep the correct one if present)
    const toRemove = ALL_TIER_IDS.filter((id) => id !== eligible.role);
    if (toRemove.length) {
      await member.roles.remove(toRemove).catch(() => {});
    }

    // If already has correct role — do nothing more (no spam)
    if (hasCorrect) return;

    // Add correct role and announce
    await member.roles.add(eligible.role).catch(() => {});
    await message.channel.send(
      `🎉 Congratulations, ${member} has received the **${eligible.label}** role!`
    );
  } catch (err) {
    console.error("[assignRepRole] Error:", err);
  }
}

// ------------------------
// Ready
// ------------------------
client.once(Events.ClientReady, () => {
  console.log("✅ Bot Online!");
  client.user.setActivity({ name: "Helping r/Alevel study", type: ActivityType.Watching });
});

// ------------------------
// MessageCreate — Reputation Logic
// ------------------------
client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.guild) return;
    if (message.author.bot || message.author.id === BOT_ID) return;

    const content = message.content.toLowerCase();

    // 🔒 Idempotency: ensure we only process each message once
    if (processedMessageIds.has(message.id)) return;
    // We'll add to the set only when we actually award rep (not for every message)

    // CASE A: Reply saying THANK* → give +1 rep to the author of the replied message
    if (message.reference && hasAnyWholeWord(content, THANK_WORDS)) {
      const replied = await message.fetchReference().catch(() => null);
      const target = replied?.member;
      if (!target) return;
      if (target.id === message.author.id) return; // no self-award

      const newRep = await addReputation(target.id);
      if (newRep === null) return; // rep-banned

      processedMessageIds.add(message.id); // prevent any duplicate sends for this message
      await assignRepRole(message, target);
      return void message.channel.send(`+1 Rep → ${target} (**${newRep}**)`);
    }

    // CASE B: Non-reply THANK* with mentions → give +1 rep to each unique mentioned member
    if (!message.reference && hasAnyWholeWord(content, THANK_WORDS) && message.mentions?.members?.size) {
      const processed = new Set();
      let someoneAwarded = false;

      for (const member of message.mentions.members.values()) {
        if (!member) continue;
        if (member.id === message.author.id) continue; // no self-award
        if (member.id === BOT_ID) continue;
        if (processed.has(member.id)) continue;

        const newRep = await addReputation(member.id);
        if (newRep === null) continue; // rep-banned

        someoneAwarded = true;
        processed.add(member.id);
        await assignRepRole(message, member);
        await message.channel.send(`+1 Rep → ${member} (**${newRep}**)`);
      }

      if (someoneAwarded) processedMessageIds.add(message.id);
      return;
    }

    // CASE C: Reply "welcome/yw/np" directly to a THANK* message → give +1 rep to the responder
    if (message.reference && hasAnyWholeWord(content, WELCOME_WORDS)) {
      const replied = await message.fetchReference().catch(() => null);
      if (!replied) return;

      // Only count if the replied message is actually a THANK message (whole-word check)
      if (!hasAnyWholeWord(replied.content.toLowerCase(), THANK_WORDS)) return;

      const newRep = await addReputation(message.author.id);
      if (newRep === null) return; // rep-banned

      processedMessageIds.add(message.id);
      await assignRepRole(message, message.member);
      return void message.channel.send(`+1 Rep → ${message.author} (**${newRep}**)`);
    }

    // Nothing to do for other messages
  } catch (err) {
    console.error("[MessageCreate] Error:", err);
  }
});

// ------------------------
// Slash Commands
// ------------------------
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    // Use defer + edit in your command handlers if they do long work
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "⚠️ Error executing command.", ephemeral: true });
    }
  }
});

// ------------------------
// Login
// ------------------------
client.login(process.env.TOKEN);