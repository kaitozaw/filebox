const { writeLog } = require('../../utils/logger');

class LoggerService {
    constructor({ zipService }) {
        this.zipService = zipService
        if (this.zipService) {
            zipService.on('ZIP_CREATED', (event) => {
                const logMessage = `[ZIP_CREATED] user=${event.userId} folder=${event.folderId} files=${event.fileCount} createdAt=${event.timestamp}`;
                writeLog('logger', logMessage);
            });
        }
    }
}

module.exports = LoggerService;
