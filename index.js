require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const connectDB = require("./database.js");
const loadCommands = require("./systems/commands.js");
const reputationSystem = require("./systems/reputation.js");
const certificateSystem = require("./systems/certificates.js");

// Connect DB
connectDB();

// Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

loadCommands(client);        // loads slash commands
reputationSystem(client);    // attach message handler
certificateSystem(client);   // attach cert button logic

process.on('unhandledRejection', error => {console.log('❌ Error (but bot keeps running):', error);});
process.on('uncaughtException', error => {console.log('❌ Big error (but bot keeps running):', error);});

client.login(process.env.TOKEN);
