const contentDisposition = require('content-disposition');
const File = require('../models/File');
const Folder = require('../models/Folder');
const fs = require('fs');
const PreviewFactory = require('./preview/PreviewFactory')
const { v4: uuidv4 } = require('uuid');
const { ValidationError, ForbiddenError, NotFoundError, UnsupportedMediaTypeError } = require('../utils/errors');

class FileService {
    constructor({ storage }) {
        this.storage = storage;
        this.previewFactory = PreviewFactory.create({ storage })
    }

    async buildDownloadHeaders(file) {
        const mime = await import('mime')
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
        const markOnce = () => { if (marked) return; marked = true; this.touchAccess(file).catch(err => console.warn('[Download] touchAccess failed', err));};
        if (typeof stream?.on === 'function') {
            stream.on('end', markOnce);
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
        try { await File.updateOne( { _id:file._id }, { $set: { deletedAt: new Date()} }); }
        catch (err) { console.warn('[FileService.remove] failed to update deletedAt', err); }
        return { message: 'File trashed successfully' };
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
        let marked = false;
        const markOnce = () => { if (marked) return; marked = true; this.touchAccess(file).catch(err => console.warn('[Public Access] touchAccess failed', err)); };
        if (typeof stream?.on === 'function') {
            stream.on('end',  markOnce);
        }
        const headers = this.buildDownloadHeaders(file);
        return { stream, headers };
    }

    async touchAccess(file) {
        if (!file || !file._id) return;
        try { await File.updateOne( { _id:file._id }, { $set: { lastAccessedAt: new Date()} }); }
        catch (err) { console.warn('[FileService.touchAccess] failed to update lastAccessedAt', err); }
    }

    async preview(userId, fileId, options = {}) {
        const file = await File.findById(fileId)
        if (!file) throw new NotFoundError('File not found')
        if (file.user.toString() !== userId) throw new ForbiddenError('Not authorized to preview this file')
        const renderer = this.previewFactory.for(file)
        return await renderer.render(file, options)
    }
    
    async getFileDetails(userId, fileId) {
        const file = await File.findById(fileId)
        if (!file) throw new NotFoundError('File not found')
        if (file.user.toString() !== userId) throw new ForbiddenError('Not authorized to view this file')
    
        return {
            id: file._id,
            name: file.name,
            size: file.size,
            mimetype: file.mimetype,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
            folder: file.folder,
            publicId: file.publicId,
            expiresAt: file.expiresAt,
            deletedAt: file.deletedAt
        }
    }

    async getFileStream(file) {
        if (!file.filePath) throw new Error('File path missing');
        return fs.createReadStream(file.filePath);
    }
}

module.exports = FileService;