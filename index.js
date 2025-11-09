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
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const RepBan = require("./models/repban.js");

// Connect to MongoDB
const connectDB = require("./database.js");
connectDB();

const Reputation = require("./models/reputation.js"); // MongoDB reputation model

const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  ActivityType,
} = require("discord.js");


const { token } = require("./config.json");

// Role IDs
const ROLE_ADMIN = "1114451108811767928";
const ROLE_BEGINNER = "1114823569864663092";
const ROLE_INTERMEDIATE = "1114823925935902770";
const ROLE_ADVANCED = "1114823886438154240";
const ROLE_EXPERT = "1114823572096045118";
const ROLE_GIGACHAD = "1114823933674410034";

const BOT_ID = "1127197280651464714";

// Create Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Load Slash Commands
client.commands = new Collection();
const commandsFolder = path.join(__dirname, "commands");

for (const folder of fs.readdirSync(commandsFolder)) {
  const folderPath = path.join(commandsFolder, folder);
  const commandFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);

    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.warn(`[WARN] ${filePath} is missing "data" or "execute"`);
    }
  }
}

// Bot Ready
client.once(Events.ClientReady, () => {
  console.log("✅ Bot Online!");
  client.user.setActivity({
    name: "Helping r/Alevel study",
    type: ActivityType.Watching,
  });
});

function containsWord(message, wordList) {
  return wordList.some(word => 
    new RegExp(`\\b${word}\\b`, "i").test(message)
  );
}

// Reputation Keywords
const THANK_WORDS = ["ty", "thank", "thnx", "thx", "thn"];
const WELCOME_WORDS = ["yw", "welcome", "no worries", "nw", "no problem", "np"];

/** Fetch or Create Reputation Record */
async function getRepRecord(userId) {
  let rep = await Reputation.findOne({ userId });
  if (!rep) rep = await Reputation.create({ userId, rep: 0 });
  return rep;
}

/** Add +1 Reputation */
async function addReputation(userId) {
  // ⛔ Stop if banned
  const isBanned = await RepBan.findOne({ userId });
  if (isBanned) return null; // return null so we can detect no rep change

  const rep = await getRepRecord(userId);
  rep.rep += 1;
  await rep.save();
  return rep.rep;
}

// /** Set Reputation (Admin Command) */
// async function setReputation(userId, value) {
//   const rep = await getRepRecord(userId);
//   rep.rep = value;
//   await rep.save();
//   return rep.rep;
// }
/** Assign Roles Based On Reputation (MongoDB + Role IDs) */
async function assignRepRole(message, member, isAuthor = false) {
  try {
    const guild = message.guild;
    if (!guild) return;

    const target = isAuthor ? message.member : await guild.members.fetch(member.id).catch(() => null);
    if (!target) return;

    // 🚫 STOP if rep-banned
    const isBanned = await RepBan.findOne({ userId: target.id });
    if (isBanned) return;

    const rep = (await getRepRecord(target.id)).rep ?? 0;

    const ROLE_TIERS = [
      { amount: 1000, role: ROLE_GIGACHAD, label: "Giga Chad (1000+ Rep)" },
      { amount: 500,  role: ROLE_EXPERT, label: "Expert (500+ Rep)" },
      { amount: 100,  role: ROLE_ADVANCED, label: "Advanced (100+ Rep)" },
      { amount: 50,   role: ROLE_INTERMEDIATE, label: "Intermediate (50+ Rep)" },
      { amount: 10,   role: ROLE_BEGINNER, label: "Beginner (10+ Rep)" },
    ];

    const eligibleTier = ROLE_TIERS.find(t => rep >= t.amount);

    // If no eligible rank (rep < 10), just remove all tier roles and exit.
    if (!eligibleTier) {
      await target.roles.remove(ROLE_TIERS.map(t => t.role)).catch(() => {});
      return;
    }

    // ✅ If already has the correct role, just ensure others are removed.
    if (target.roles.cache.has(eligibleTier.role)) {
      const rolesToRemove = ROLE_TIERS
        .filter(t => t.role !== eligibleTier.role)
        .map(t => t.role);

      await target.roles.remove(rolesToRemove).catch(() => {});
      return; // No announcement, no spam ✅
    }

    // ✅ Otherwise: remove all tier roles THEN add new one
    await target.roles.remove(ROLE_TIERS.map(t => t.role)).catch(() => {});
    await target.roles.add(eligibleTier.role).catch(() => {});

    // 🎉 Only send message on actual new rank
    await message.channel.send(
      `🎉 Congratulations, ${target} has received the **${eligibleTier.label}** role!`
    );

  } catch (err) {
    console.error("[assignRepRole] Error:", err);
  }
}


// Message Listener
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || message.author.id === BOT_ID) return;

  const content = message.content.toLowerCase();
  const prefix = "!";

  // Admin manual rep set
  if (content.startsWith(prefix)) {
    const args = content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift();

    if (command === "rep") {
      if (!message.member.roles.cache.has(ROLE_ADMIN)) return;

      const user = message.mentions.users.first();
      const amount = parseInt(args[1]);
      if (!user || isNaN(amount)) return message.channel.send("Usage: `!rep @user <value>`");

      const newRep = await setReputation(user.id, amount);
      return message.channel.send(`✅ Set ${user}'s rep to **${newRep}**`);
    }
  }

  // "You're welcome" → Give rep to responder
if (containsWord(content, WELCOME_WORDS)) {
  try {
    const replied = await message.fetchReference();
    if (THANK_WORDS.some((t) => replied.content.toLowerCase().includes(t))) return;

    const newRep = await addReputation(message.author.id);
    if (newRep === null) return; // ⛔ banned: do not announce, do not assign role

    await assignRepRole(message, message.member, true);
    return message.channel.send(`+1 Rep → ${message.author} (**${newRep}**)`);
  } catch {}
}

 // "Thank you" → Give rep to mentioned users
if (containsWord(content, THANK_WORDS)) {
  message.mentions.members?.forEach(async (member) => {
    if (!member || member.id === BOT_ID || member.id === message.author.id) return;

    const rep = await addReputation(member.id);
    if (rep === null) return; // ⛔ banned: don't show message or assign role

    await assignRepRole(message, member, false);
    message.channel.send(`+1 Rep → ${member} (**${rep}**)`);
  });
}
});

// Slash Commands Handler
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: "⚠️ Error executing command.", ephemeral: true });
  }
});

// Login
client.login(token);