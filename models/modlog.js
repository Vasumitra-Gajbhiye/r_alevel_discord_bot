const mongoose = require("mongoose");

const ModLogSchema = new mongoose.Schema({
    userId: { type: String, required: true },        // Person who got warned
    targetChannel: { type: String },
    moderatorId: { type: String, required: true },   // Mod who issued the action
    action: { type: String, required: true },        // "warn", "mute", etc
    reason: { type: String, required: true },
    actionId: { type: String, required: true, unique: true },  // Unique ID
    targetTag: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ModLog", ModLogSchema);