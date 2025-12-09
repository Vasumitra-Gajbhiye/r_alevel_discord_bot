// Wraping text by words
function wrapText(text, width, isGraphic = false) {
    // fallback if empty
    if (!text) return [''];

    const words = text.split(' ');
    const lines = [];
    let cur = '';

    for (let w of words) {
        if ((cur + (cur ? ' ' : '') + w).length > width) {
        lines.push(isGraphic ? cur.trimStart() : cur);
        cur = w;
        } else {
        cur = cur ? cur + ' ' + w : w;
        }
    }
    if (cur.trim() !== '') lines.push(isGraphic ? cur.trimStart() : cur);

    return lines;
}


function formatBoard(tasks, team, boardId) {
    const COL_TASK = 4;      
    const COL_DESC = 40;      
    const GAP = 2;            
    const COL_STATUS = 12;
    const COL_DEADLINE = 12;

    // header
    let header;
    if (team === "graphic") {
        header = `No. Description${" ".repeat(COL_DESC - "Description".length)}  Deadline  `;
    } else {
        header = `No. Description${" ".repeat(COL_DESC - "Description".length)}  Status    `;}

    const border = '-'.repeat(header.length);
    const rows = [header, border];

    // build rows
    for (const task of tasks) {
        const wrapped = wrapText(task.description || '', COL_DESC, team === 'graphic');

        wrapped.forEach((line, idx) => {
        if (idx === 0) {
            // first line includes the status/deadline column
            if (team === 'graphic') {
            const deadlineText = (task.deadline && task.deadline !== 'None') ? task.deadline : 'None';
            rows.push(
                task.number.toString().padEnd(COL_TASK) +
                line.padEnd(COL_DESC) +
                ' '.repeat(GAP) +
                deadlineText.padEnd(COL_DEADLINE)
            );
            } else {
            const statusText = task.status || 'Unclaimed';
            rows.push(
                task.number.toString().padEnd(COL_TASK) +
                line.padEnd(COL_DESC) +
                ' '.repeat(GAP) +
                statusText.padEnd(COL_STATUS)
            );
            }
        } else {
            // subsequent wrapped lines (left aligned)
            rows.push(' '.repeat(COL_TASK) + line.padEnd(COL_DESC));
        }
        });
    }

    return '```txt\n' + rows.join('\n') + '\n```';
}

function formatStatusTable(tasks, team) {
    const COL_TASK = 4;      
    const COL_ASSIGNED = 20;     
    const COL_STATUS = 12;     
    const GAP = 2;            

    // header
    const header = `No. Assigned To${" ".repeat(COL_ASSIGNED - "Assigned To".length)}  Status    `;
    const border = '-'.repeat(header.length);
    const rows = [header, border];

    // build rows
    for (const task of tasks) {
        // Get assigned to info
        let assignedTo = '';
        if (team === 'graphic') {
            assignedTo = 'GFX Team';
        } else if (task.status === 'Claimed' && task.claimerName) {
            assignedTo = task.claimerName;
        } else if (task.status === 'Completed' && task.claimerName) {
            assignedTo = task.claimerName;
        } else {
            assignedTo = 'Unknown';
        }

        // First line with task number, assigned to, and status
        rows.push(
            task.number.toString().padEnd(COL_TASK) +
            assignedTo.padEnd(COL_ASSIGNED) +
            ' '.repeat(GAP) +
            task.status.padEnd(COL_STATUS)
        );
    }

    return '```txt\n' + rows.join('\n') + '\n```';
}

module.exports = {
    wrapText,
    formatBoard,
    formatStatusTable
};
