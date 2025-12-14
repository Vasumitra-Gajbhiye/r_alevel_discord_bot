const Sticky = require("../models/sticky.js");

const LINE_THRESHOLD = 3; // repost after 3 lines

module.exports = function stickySystem(client) {
  // channelId -> { lineCount }
  const stickyState = new Map();

  client.on("messageCreate", async (message) => {
    // Ignore bots & DMs
    if (!message.guild || message.author.bot) return;

    const sticky = await Sticky.findOne({
      channelId: message.channel.id,
      enabled: true,
    });

    if (!sticky) return;

    // Prevent reacting to the sticky itself
    if (message.id === sticky.lastMessageId) return;

    // Get or init state
    let state = stickyState.get(message.channel.id);
    if (!state) {
      state = { lineCount: 0 };
      stickyState.set(message.channel.id, state);
    }

    // Count how many lines this message adds
    // Split on newlines; empty message still counts as 1 visual line
    const linesAdded =
      (message.content?.split("\n").length || 1);

    state.lineCount += linesAdded;

    // Not enough displacement yet
    if (state.lineCount < LINE_THRESHOLD) return;

    // Reset counter
    state.lineCount = 0;

    // Delete old sticky
    if (sticky.lastMessageId) {
      try {
        await message.channel.messages.delete(sticky.lastMessageId);
      } catch {}
    }

    const formatted =
      `__**Stickied Message:**__\n\n${sticky.content}`;

    // Send new sticky
    const sent = await message.channel.send({
      content: formatted,
      allowedMentions: { parse: [] },
    });

    // Update DB only when reposting
    sticky.lastMessageId = sent.id;
    await sticky.save();
  });
};