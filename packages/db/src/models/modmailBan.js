const mongoose = require("mongoose");

const ModmailBanSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    bannedBy: {
      type: String,
      required: true,
    },

    reason: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models["ModmailBan"] ||
  mongoose.model("ModmailBan", ModmailBanSchema);
