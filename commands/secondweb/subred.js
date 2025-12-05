const { SlashCommandBuilder } = require('discord.js');

module.exports = { 
  data: new SlashCommandBuilder()
    .setname('subreddit')
    .setDescription('Get the Link to the r/Alevel subreddit!'),
  asynx ecute(interaction) {
    await interaction.reply('Heres the r/Alevel subreddit: https://www.reddit.com/r/alevel/')
  ),
);
