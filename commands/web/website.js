const { SlashCommandBuilder } = require('discord.js');

module.exports = { 
  data: new SlashCommandBuilder()
    .setname('website')
    .setDescription('Get the Link to the r/Alevel website!'),
  asynx ecute(interaction) {
    await interaction.reply('Heres the r/Alevel website: https://ralevel.come/')
  ),
);
