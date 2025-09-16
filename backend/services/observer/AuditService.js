const { writeLog } = require('../../utils/logger');
const AuditLog = require('../../models/AuditLog');

class AuditService {
    constructor({ zipService }) {
        this.zipService = zipService;
        if (this.zipService) {
            zipService.on('ZIP_CREATED', async (event) => {
                try {
                    await AuditLog.create({ user: event.userId, folder: event.folderId, fileCount: event.fileCount, createdAt: event.timestamp });
                    const logMessage = `[ZIP_CREATED] user=${event.userId} folder=${event.folderId} files=${event.fileCount} createdAt=${event.timestamp} action=auditLog`;
                    writeLog('audit', logMessage);
                } catch (err) {
                    writeLog('audit', `Failed to record audit log: ${err.message}`);
                }
            });
        }
    }
}

module.exports = AuditService;
