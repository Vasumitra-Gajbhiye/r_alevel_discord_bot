const mongoose = require("mongoose");

const repBanSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }
});

module.exports = mongoose.model("RepBan", repBanSchema);