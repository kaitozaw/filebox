const BaseController = require('./BaseController');

class FileController extends BaseController {
    constructor({ fileService }) {
        super();
        this.fileService = fileService;
    }

    async listFilesInFolder(req, res) {
        try { return this.ok(res, await this.fileService.listInFolder(req.user.id, req.params.folderId)); }
        catch (err) { return this.handleError(res, err); }
    }

    async downloadFile(req, res) {
        try {
            const { stream, headers } = await this.fileService.download(req.user.id, req.params.fileId);
            Object.entries(headers).forEach(([k, v]) => v !== undefined && res.setHeader(k, v));
            return stream.pipe(res);
        } catch (err) {
            return this.handleError(res, err);
        }
    }

    async uploadFile(req, res) {
        try { return this.created(res, await this.fileService.uploadToFolder(req.user.id, req.params.folderId, req.file)); }
        catch (err) { return this.handleError(res, err); }
    }

    async generatePublicUrl(req, res) {
        try { return this.ok(res, await this.fileService.generatePublicUrl(req.user.id, req.params.fileId, process.env.BASE_URL)); }
        catch (err) { return this.handleError(res, err); }
    }

    async renameFile(req, res) {
        try { return this.ok(res, await this.fileService.rename(req.user.id, req.params.fileId, req.body)); }
        catch (err) { return this.handleError(res, err); }
    }

    async deleteFile(req, res) {
        try { return this.ok(res, await this.fileService.remove(req.user.id, req.params.fileId)); }
        catch (err) { return this.handleError(res, err); }
    }

    async accessPublicFile(req, res) {
        try {
            const { stream, headers } = await this.fileService.accessPublic(req.params.publicId);
            Object.entries(headers).forEach(([k, v]) => v !== undefined && res.setHeader(k, v));
            return stream.pipe(res);
        } catch (err) {
            if (err.status === 410) return res.status(410).json({ message: err.message });
            return this.handleError(res, err);
        }
    }
}

module.exports = { FileController };