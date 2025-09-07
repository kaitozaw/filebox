const BaseController = require('./BaseController');

class FolderController extends BaseController {
    constructor({ folderService }) {
        super();
        this.folderService = folderService;
    }

    async getFolders(req, res) {
        try { return this.ok(res, await this.folderService.list(req.user.id)); }
        catch (err) { return this.handleError(res, err); }
    }

    async createFolder(req, res) {
        try { return this.created(res, await this.folderService.create(req.user.id, req.body)); }
        catch (err) { return this.handleError(res, err); }
    }

    async updateFolder(req, res) {
        try { return this.ok(res, await this.folderService.update(req.user.id, req.params.id, req.body)); }
        catch (err) { return this.handleError(res, err); }
    }

    async deleteFolder(req, res) {
        try { return this.ok(res, await this.folderService.remove(req.user.id, req.params.id)); }
        catch (err) { return this.handleError(res, err); }
    }
}

module.exports = { FolderController };