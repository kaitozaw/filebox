const { writeLog } = require('../utils/logger');

class LoggerService {
    constructor({ zipService }) {
        if (zipService) {
            zipService.on('ZIP_CREATED', (event) => {
                const logMsg = `User ${event.userId} created ZIP from folder ${event.folderId} with ${event.fileCount} files at ${event.timestamp}`;
                writeLog('logger', logMsg);
            });
        }
    }
}

module.exports = LoggerService;
