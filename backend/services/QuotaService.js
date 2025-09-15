// backend/services/QuotaService.js
const { writeLog } = require('../utils/logger');

class QuotaService {
    constructor({ zipLogModel, zipService }) {
        this.zipLogModel = zipLogModel;
        this.zipService = zipService;

        // Subscribe to observer event
        zipService.on('ZIP_CREATED', async (event) => {
        await this.logZipDownload(event.userId, event.folderId, event.fileCount);
        });
        
    }

    async checkQuota(userId) {
        const windowMinutes = 1; // configurable (e.g., via env var)
        const limit = 6;         // configurable
        const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);

        const count = await this.zipLogModel.countDocuments({
        user: userId,
        createdAt: { $gte: cutoff }

        });

        const result = {
        overQuota: count >= limit,
        count,
        limit,
        windowMinutes,
        retryAfterSeconds: windowMinutes * 60
        };

        return result;
    }

    async logZipDownload(userId, folderId, fileCount) {
    try {
        await this.zipLogModel.create({ user: userId, folder: folderId, fileCount });
        const msg = `Logged download for user ${userId} (folder ${folderId}, ${fileCount} files)`;
        writeLog('quota', msg);
    } catch (err) {
        writeLog('quota', `❌ Failed to log download: ${err.message}`);
        console.error('[QuotaService] Failed to log zip download:', err);
    }
}        
    
}

module.exports = QuotaService;
