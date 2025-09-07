const File = require('../models/File');
const Folder = require('../models/Folder');
const fs = require('fs');
const path = require('path');
const mime = require('mime');
const contentDisposition = require('content-disposition');
const { v4: uuidv4 } = require('uuid');
const { ValidationError, UnauthorizedError, ForbiddenError, NotFoundError } = require('../utils/errors');

class FileService {
    async listInFolder(userId, folderId) {
        const folder = await Folder.findById(folderId);
        if (!folder) throw new NotFoundError('Folder not found');
        if (folder.user.toString() !== userId) throw new ForbiddenError('Not authorized to view this folder');
        return File.find({ folder: folder._id }).sort({ createdAt: -1 });
    }

    async download(userId, fileId, res) {
        const file = await File.findById(fileId);
        if (!file) throw new NotFoundError('File not found');
        if (file.user.toString() !== userId) throw new ForbiddenError('Not authorized to download this file');
        const savedFilePath = path.isAbsolute(file.filePath) ? file.filePath : path.join(__dirname, '..', file.filePath);
        if (!fs.existsSync(savedFilePath)) throw new NotFoundError('File not found on server');
        return res.download(savedFilePath, file.name);
    }

    async uploadToFolder(userId, folderId, uploaded) {
        const folder = await Folder.findById(folderId);
        if (!folder) throw new NotFoundError('Folder not found');
        if (folder.user.toString() !== userId) throw new ForbiddenError('Not authorized to upload to this folder');
        const file = await File.create({
            user: userId,
            folder: folder._id,
            name: uploaded.originalname,
            size: uploaded.size,
            mimetype: uploaded.mimetype,
            filePath: path.join('uploads', path.basename(uploaded.path)),
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
        const savedFilePath = path.isAbsolute(file.filePath) ? file.filePath : path.join(__dirname, '..', file.filePath);
        if (fs.existsSync(savedFilePath)) {
            fs.unlinkSync(savedFilePath);
        }
        await file.deleteOne();
        return { message: 'File deleted successfully' };
    }

    async accessPublic(publicId, res) {
        const file = await File.findOne({ publicId });
        if (!file) throw new NotFoundError('Shared file not found');
        if (file.expiresAt && new Date() > file.expiresAt) {
            const err = new Error('This link has expired.');
            err.code = 410;
            throw err;
        }
        const savedFilePath = path.isAbsolute(file.filePath) ? file.filePath : path.join(__dirname, '..', file.filePath);
        if (!fs.existsSync(savedFilePath)) throw new NotFoundError('File not found on server');
        const stat = fs.statSync(savedFilePath);
        const type = file.mimetype || mime.getType(file.name) || 'application/octet-stream';
        res.setHeader('Content-Type', type);
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Disposition', contentDisposition(file.name));
        return fs.createReadStream(savedFilePath).pipe(res);
    }
}

module.exports = FileService;