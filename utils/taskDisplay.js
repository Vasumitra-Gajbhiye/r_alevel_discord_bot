const { EmbedBuilder } = require('discord.js');
const Task2 = require('../models/task2.js');

async function updateTaskDisplay(channel, team) {
    try {
        // Get active tasks (not completed)
        const activeTasks = await Task2.find({ 
            team, 
            status: { $in: ['open', 'claimed', 'finished'] }
        }).sort({ createdAt: 1 });

        // Create table using your formatting style
        const table = formatTaskList(activeTasks, team);
        
        const embed = new EmbedBuilder()
            .setTitle(`${team === 'dev' ? 'Developer' : 'Graphic Designer'} Tasks`)
            .setColor(team === 'dev' ? 'Blue' : 'Purple')
            .setDescription(table)
            .setFooter({ text: `Total: ${activeTasks.length} active tasks` });

        // Look for existing task display message
        const existingMessages = await channel.messages.fetch({ limit: 50 });
        let displayMessage = null;
        
        for (const [_, msg] of existingMessages) {
            const embed = msg.embeds[0];
            if (embed && 
                embed.title === `${team === 'dev' ? 'Developer' : 'Graphic Designer'} Tasks` && 
                msg.author.id === channel.client.user.id) {
                displayMessage = msg;
                break;
            }
        }

        if (displayMessage) {
            await displayMessage.edit({ embeds: [embed] });
            return displayMessage.id;
        } else {
            const newMessage = await channel.send({ embeds: [embed] });
            return newMessage.id;
        }
    } catch (error) {
        console.error('Error updating task display:', error);
        return null;
    }
}

function formatTaskList(tasks, team) {
    const COL_TASK = 8;       // "tsk-001"
    const COL_TITLE = 30;     // Title
    const COL_EXTRA = 20;     // Status (dev) or Deadline (graphic)
    const GAP = 2;

    // Header based on team
    let header;
    if (team === 'graphic') {
        header = `Task ID${" ".repeat(COL_TASK - "Task ID".length)}  Title${" ".repeat(COL_TITLE - "Title".length)}  Deadline    `;
    } else {
        header = `Task ID${" ".repeat(COL_TASK - "Task ID".length)}  Title${" ".repeat(COL_TITLE - "Title".length)}  Status      `;
    }

    const border = '--------------------------------------------------------'
    const rows = [header, border];

    // Build rows
    for (const task of tasks) {
        const taskId = task.taskId.padEnd(COL_TASK);
        const title = (task.title || '').substring(0, COL_TITLE).padEnd(COL_TITLE);
        
        let extraColumn;
        if (team === 'graphic') {
            // Graphics: Show deadline
            extraColumn = (task.deadline || 'None').padEnd(COL_EXTRA);
        } else {
            // Devs: Show status with emoji
            let statusText = task.status;
            if (statusText === 'claimed') statusText = 'Claimed';
            if (statusText === 'finished') statusText = 'Finished';
            if (statusText === 'open') statusText = 'Open';
            extraColumn = statusText.padEnd(COL_EXTRA);
        }

        rows.push(
            taskId +
            ' '.repeat(GAP) +
            title +
            ' '.repeat(GAP) +
            extraColumn
        );
    }

    return '```txt\n' + rows.join('\n') + '\n```';
}

module.exports = { updateTaskDisplay, formatTaskList };

