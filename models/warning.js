const mongoose = require("mongoose");

const WarningSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Warning", WarningSchema);