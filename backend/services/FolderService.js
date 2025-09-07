const Folder = require('../models/Folder');
const { ValidationError, UnauthorizedError, ForbiddenError, NotFoundError } = require('../utils/errors');

class FolderService {
    async list(userId) {
        const folders = await Folder.find({ user: userId }).sort({ createdAt: -1 });
        return folders.map((f) => ({ id: f._id, name: f.name, user: f.user, createdAt: f.createdAt }));
    }

    async create(userId, { name }) {
        if (!name) throw new ValidationError('Folder name is required');
        const folder = await Folder.create({ name, user: userId });
        return { id: folder._id, name: folder.name, user: folder.user, createdAt: folder.createdAt };
    }

    async update(userId, folderId, { name }) {
        if (!name) throw new ValidationError('Folder name is required');
        const folder = await Folder.findById(folderId);
        if (!folder) throw new NotFoundError('Folder not found');
        if (folder.user.toString() !== userId) throw new ForbiddenError('Not authorized to update this folder');
        folder.name = name;
        const updated = await folder.save();
        return { id: updated._id, name: updated.name, user: updated.user, createdAt: updated.createdAt };
    }

    async remove(userId, folderId) {
        const folder = await Folder.findById(folderId);
        if (!folder) throw new NotFoundError('Folder not found');
        if (folder.user.toString() !== userId) throw new ForbiddenError('Not authorized to delete this folder');
        await folder.deleteOne();
        return { message: 'Folder deleted successfully' };
    }
}

module.exports = FolderService;