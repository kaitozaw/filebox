const fs = require('fs');
const path = require('path');

function writeLog(serviceName, message) {
    const LOGDIR = path.resolve(__dirname, '..', 'logs');
    if (!fs.existsSync(LOGDIR)) fs.mkdirSync(LOGDIR, { recursive: true });
    const filePath = path.join(LOGDIR, `${serviceName}.log`);
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFile(filePath, logMessage, (err) => {
        if (err) console.error(`Failed to write log for ${serviceName}:`, err);
    });
}

module.exports = { writeLog };