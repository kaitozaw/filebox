// backend/services/ZipAccessProxy.js
class ZipAccessProxy {
    constructor({ zipService, folderService }) {
        this.zipService = zipService;
        this.folderService = folderService;
    }

    async zipFolder({ userId, folderId, fileIds }) {
        // Permission check
        const folder = await this.folderService.getFolderById(folderId);
        if (!folder || folder.user.toString() !== userId) {
        const err = new Error('Permission denied');
        err.name = 'PermissionError';
        throw err;
        }

        // Forward to the real zip service
        return this.zipService.zipFolder({ userId, folderId, fileIds });
    }
}

module.exports = ZipAccessProxy;
