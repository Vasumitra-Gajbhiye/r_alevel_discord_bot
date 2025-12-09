const mongoose = require('mongoose');

const taskBoardSchema = new mongoose.Schema({
    team: String,
    channelId: String,
    messageId: String,
    tasks: [
    {
        number: Number,
        description: String,
        status: {type: String, default: 'Unclaimed'},
        deadline: String // only graphic
    }
    ],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TaskBoard', taskBoardSchema);
