const { ValidationError, ForbiddenError, NotFoundError, TooManyRequestsError } = require('../../utils/errors');

class ZipServiceProxy {
    constructor({ folderService, fileService, zipService, quotaService }) {
        this.folderService = folderService;
        this.fileService = fileService;
        this.zipService = zipService;
        this.quotaService = quotaService;
    }

    async zipFolder({ userId, folderId, fileIds }) {
        // 1. Permission check
        const folder = await this.folderService.getFolderById(folderId);
        if (!folder) throw new NotFoundError('Folder not found');
        if (folder.user.toString() !== userId) throw new ForbiddenError('Not authorized to view this folder');

        // 2. Quota check
        const quota = await this.quotaService.checkQuota(userId);
        if (quota.overQuota) throw new TooManyRequestsError("You have reached your quota. Try again later.")

        // 3. File selection check
        if (!fileIds || fileIds.length == 0) throw new ValidationError('No file is selected');
        if (fileIds.length > 5) throw new ValidationError('Maximum 5 files allowed');
        
        // 4. Filter by selected fileIds
        let files = await this.fileService.listInFolder(userId, folderId);
        if (fileIds && fileIds.length > 0) {
            files = files.filter(f => fileIds.includes(f._id.toString()));
        }

        // 5. Forward to ZipService (Facade)
        return this.zipService.zipFolder({ folder, files });
    }
}

module.exports = ZipServiceProxy;
