const fs = require("fs");
const path = require("path");
const { Collection } = require("discord.js");

module.exports = (client) => {
    client.commands = new Collection();

    const commandsPath = path.join(__dirname, "..", "commands");

    for (const folder of fs.readdirSync(commandsPath)) {
        const folderPath = path.join(commandsPath, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        for (const file of fs.readdirSync(folderPath).filter(f => f.endsWith(".js"))) {
            const cmd = require(path.join(folderPath, file));
            if (cmd.data && cmd.execute) {
                client.commands.set(cmd.data.name, cmd);
            }
        }
    }

    client.on("interactionCreate", async interaction => {
        if (!interaction.isChatInputCommand()) return;
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction);
    });
};