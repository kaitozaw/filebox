const { writeLog } = require('../utils/logger');

class AuditService {
    constructor({ zipService, auditLogModel: AuditLog }) {
        this.auditLogModel = AuditLog;

        if (zipService) {
            zipService.on('ZIP_CREATED', async (event) => {
                try {
                       // 👇 This is where AuditLog.create(...) happens
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
