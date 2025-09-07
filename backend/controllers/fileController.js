const BaseController = require('./BaseController');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

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
        try { return await this.fileService.download(req.user.id, req.params.fileId, res); }
        catch (err) { return this.handleError(res, err); }
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
        try { return await this.fileService.accessPublic(req.params.publicId, res); }
        catch (err) { return this.handleError(res, err); }
    }
}

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); }
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

module.exports = { FileController, upload };