const File = require('../models/File')
const { ValidationError, ForbiddenError, NotFoundError } = require('../utils/errors')

class TrashService {
  constructor({ storage }) {
    this.storage = storage
  }

  async list(userId) {
    return File.find({ user: userId, deletedAt: { $ne: null } })
      .populate('folder', 'name')
      .sort({ deletedAt: -1 })
  }

  async restore(userId, fileId) {
    const file = await File.findById(fileId)
    if (!file) throw new NotFoundError('File not found')
    if (file.user.toString() !== userId)
      throw new ForbiddenError('Not authorized to restore this file')
    if (!file.deletedAt) throw new ValidationError('File is not in trash')

    file.deletedAt = null
    await file.save()
    return { message: 'File restored successfully' }
  }

  async purge(userId, fileId) {
    const file = await File.findById(fileId)
    if (!file) throw new NotFoundError('File not found')
    if (file.user.toString() !== userId)
      throw new ForbiddenError('Not authorized to permanently delete this file')
    if (!file.deletedAt) throw new ValidationError('File is not in trash')

    await this.storage.remove(file.filePath)
    await file.deleteOne()
    return { message: 'File permanently deleted' }
  }
}

module.exports = TrashService
