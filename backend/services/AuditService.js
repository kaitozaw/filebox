const { writeLog } = require('../utils/logger');

class AuditService {
    constructor({ zipService, auditLogModel }) {
        this.auditLogModel = auditLogModel;

        if (zipService) {
            zipService.on('ZIP_CREATED', async (event) => {
                try {
                    await this.auditLogModel.create({
                        user: event.userId,
                        folder: event.folderId,
                        fileCount: event.fileCount,
                        createdAt: event.timestamp,
                    });

                    const logMsg = `Recorded audit log: User ${event.userId}, Folder ${event.folderId}, Files ${event.fileCount}`;
                    writeLog('audit', logMsg);
                } catch (err) {
                    writeLog('audit', `Failed to record audit log: ${err.message}`);
                }
            });
        }
    }
}

module.exports = AuditService;
