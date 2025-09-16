const { writeLog } = require('../../utils/logger');
const QuotaLog = require('../../models/QuotaLog');

class QuotaService {
    constructor({ zipService }) {
        this.zipService = zipService;
        if (this.zipService) {
            zipService.on('ZIP_CREATED', async (event) => {
                try {
                    await QuotaLog.create({ user: event.userId, folder: event.folderId, fileCount: event.fileCount, createdAt: event.timestamp });
                    const logMessage = `[ZIP_CREATED] user=${event.userId} folder=${event.folderId} files=${event.fileCount} createdAt=${event.timestamp} action=quotaLog`;
                    writeLog('quota', logMessage);
                } catch (err) {
                    writeLog('quota', `Failed to record quota log: ${err.message}`);
                }
            });
        }
    }

    async checkQuota(userId) {
        const windowMinutes = 1;
        const limit = 6;
        const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);

        const count = await QuotaLog.countDocuments({
            user: userId,
            createdAt: { $gte: cutoff }
        });

        const result = {
            overQuota: count > limit,
            count,
            limit,
            windowMinutes,
            retryAfterSeconds: windowMinutes * 60
        };

        return result;
    }
}

module.exports = QuotaService;