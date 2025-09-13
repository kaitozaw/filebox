class ZipAccessProxy {
    constructor({ zipService, folderService, fileService, quotaService }) {
        this.zipService = zipService;
        this.folderService = folderService;
        this.fileService = fileService;   // Add fileService
        this.quotaService = quotaService;
    }

    async zipFolder({ userId, folderId, fileIds }) {
        // 1. Permission check
        const folder = await this.folderService.getFolderById(folderId);
        if (!folder || folder.user.toString() !== userId) {
        const err = new Error('Permission denied: You do not own this folder.');
        err.name = 'PermissionError';
        throw err;
        }

        // 2. Quota check
        const quota = await this.quotaService.checkQuota(userId);
        if (quota.overQuota) {
        const err = new Error(
            `You have reached your quota: 3 downloads every ${quota.windowMinutes} minute(s). You already used 3.`
        );
        err.name = 'QuotaError';
        err.details = quota; // pass structured data
        throw err;
        }


        // 3. Fetch files using FileService
        let files = await this.fileService.getFilesByFolder(userId, folderId);

        // 4. Filter by selected fileIds
        if (fileIds && fileIds.length > 0) {
        files = files.filter(f => fileIds.includes(f._id.toString()));
        }

        // 5. Enforce max 5 files
        if (files.length > 5) {
        const err = new Error('Validation failed: Maximum 5 files allowed.');
        err.name = 'ValidationError';
        throw err;
        }

        // 6. Log quota usage (important for future enforcement)
        await this.quotaService.logZipDownload(userId, folderId, files.length);

        // 7. Forward to ZipService (Facade)
        return this.zipService.zipFolder({ folder, files });
    }
}

module.exports = ZipAccessProxy;
