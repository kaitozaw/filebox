class QuotaService {
    constructor({ zipLogModel }) {
        this.zipLogModel = zipLogModel;
    }

    async checkQuota(userId) {
        const windowMinutes = 1; // configurable (e.g., via env var)
        const limit = 3;         // configurable (e.g., via env var)
        const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);

        const count = await this.zipLogModel.countDocuments({
        user: userId,
        createdAt: { $gte: cutoff }
        });

        return {
        overQuota: count >= limit,
        count,
        limit,
        windowMinutes,
        retryAfterSeconds: windowMinutes * 60 // helpful for UI countdown
        };
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
