const File = require('../models/File');
const Folder = require('../models/Folder');
const mime = require('mime');
const contentDisposition = require('content-disposition');
const { v4: uuidv4 } = require('uuid');
const { ValidationError, ForbiddenError, NotFoundError } = require('../utils/errors');

class FileService {
    constructor({ storage }) {
        this.storage = storage;
    }

    buildDownloadHeaders(file) {
        const type = file.mimetype || mime.getType(file.name) || 'application/octet-stream';
        const headers = {
            'Content-Type': type,
            'Content-Disposition': contentDisposition(file.name),
        };
        if (file.size) headers['Content-Length'] = file.size;
        return headers;
    }

    async listInFolder(userId, folderId) {
        const folder = await Folder.findById(folderId);
        if (!folder) throw new NotFoundError('Folder not found');
        if (folder.user.toString() !== userId) throw new ForbiddenError('Not authorized to view this folder');
        return File.find({ folder: folder._id }).sort({ createdAt: -1 });
    }

    async download(userId, fileId) {
        const file = await File.findById(fileId);
        if (!file) throw new NotFoundError('File not found');
        if (file.user.toString() !== userId) throw new ForbiddenError('Not authorized to download this file');
        const { stream } = this.storage.stream(file.filePath);
        let marked = false;
        const markOnce = () => { if (marked) return; marked = true; this.touchAccess(file) .catch(err => console.warn('[Download] touchAccess failed', err));};
        if (typeof stream.on === 'function') {
            stream.on('data', markOnce);
            stream.on('end', markOnce);
            stream.on('error', markOnce);
        }
        const headers = this.buildDownloadHeaders(file);
        return { stream, headers };
    }

    async uploadToFolder(userId, folderId, uploaded) {
        const folder = await Folder.findById(folderId);
        if (!folder) throw new NotFoundError('Folder not found');
        if (folder.user.toString() !== userId) throw new ForbiddenError('Not authorized to upload to this folder');
        const saved = await this.storage.save({ uploaded });
        const file = await File.create({
            user: userId,
            folder: folder._id,
            name: saved.downloadName,
            size: saved.size,
            mimetype: saved.mimetype,
            filePath: saved.filePath,
        });
        return file;
    }

    async generatePublicUrl(userId, fileId, baseUrl) {
        const file = await File.findById(fileId);
        if (!file) throw new NotFoundError('File not found');
        if (file.user.toString() !== userId) throw new ForbiddenError('Not authorized to share this file');
        file.publicId = uuidv4();
        file.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await file.save();
        const publicUrl = `${baseUrl}/api/public/${file.publicId}`;
        return { publicUrl };
    }

    async rename(userId, fileId, { name }) {
        if (!name || !name.trim()) throw new ValidationError('New file name is required');
        const file = await File.findById(fileId);
        if (!file) throw new NotFoundError('File not found');
        if (file.user.toString() !== userId) throw new ForbiddenError('Not authorized to rename this file');
        file.name = name;
        const updated = await file.save();
        return { id: updated._id, name: updated.name, size: updated.size, mimetype: updated.mimetype, createdAt: updated.createdAt };
    }

    async remove(userId, fileId) {
        const file = await File.findById(fileId);
        if (!file) throw new NotFoundError('File not found');
        if (file.user.toString() !== userId) throw new ForbiddenError('Not authorized to delete this file');
        await this.storage.remove(file.filePath);
        await file.deleteOne();
        return { message: 'File deleted successfully' };
    }

    async accessPublic(publicId) {
        const file = await File.findOne({ publicId });
        if (!file) throw new NotFoundError('Shared file not found');
        if (file.expiresAt && new Date() > file.expiresAt) {
            const err = new Error('This link has expired.');
            err.status = 410;
            throw err;
        }
        const { stream } = this.storage.stream(file.filePath);
        const markOnce = (() => { let done = false; return () => { if (done) return; done = true; this.touchAccess(file).catch(err => console.warn('[Public Access] touchAccess failed', err)); }; })();
        if (typeof stream?.once === 'function') {
            stream.once('data', markOnce);
        } else if (typeof stream?.on === 'function') {
            stream.one('data', markOnce);
        }
        const headers = this.buildDownloadHeaders(file);
        return { stream, headers };
    }

    async touchAccess(file) {
        if (!file || !file._id) return;
        try {
            await File.updateOne( { _id:file._id }, { $set: { lastAccessedAt: new Date()} });
        } catch (err) {console.warn('[FileService.touchAccess] failed to update lastAccessedAt', err);
        }
    }
}

module.exports = FileService;