const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logDir = path.resolve(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

function writeLog(serviceName, message) {
    const filePath = path.join(logDir, `${serviceName}.log`);
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFile(filePath, logMessage, (err) => {
        if (err) console.error(`Failed to write log for ${serviceName}:`, err);
    });
}

module.exports = { writeLog };
