// backend/services/QuotaService.js
class QuotaService {
    constructor({ zipLogModel }) {
        this.zipLogModel = zipLogModel; // optional, use DB to persist usage
    }

    async isOverQuota(userId) {
        const minutes = 1; // past 1 minute
        const oneMinuteAgo = new Date(Date.now() - minutes * 60 * 1000);

        const count = await this.zipLogModel.countDocuments({
        user: userId,
        createdAt: { $gte: oneMinuteAgo }
        });

        return count >= 3; // over quota if 3 or more in past minute
    }

    async logZipDownload(userId, folderId, fileCount) {
        await this.zipLogModel.create({
        user: userId,
        folder: folderId,
        fileCount
        });
    }
}

module.exports = QuotaService;
