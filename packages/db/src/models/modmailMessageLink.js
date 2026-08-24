const mongoose = require("mongoose");

const ModmailMessageLinkSchema = new mongoose.Schema(
  {
    threadId: {
      type: String,
      required: true,
      index: true,
    },

    dmMessageId: {
      type: String,
      required: true,
      unique: true,
    },

    threadMessageId: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models["ModmailMessageLink"] ||
  mongoose.model("ModmailMessageLink", ModmailMessageLinkSchema);
