const File = require('../models/File');

class RecentService {
    async listByUser(userId, { limit = 20 } = {}) {
      const lim = Math.min(100, Math.max(1, Number(limit) || 20));
      return File.find({
        user: userId,
        lastAccessedAt: { $ne: null }
      }).sort({ lastAccessedAt: -1, _id: -1 })
      .limit(lim)
      .select('_id name lastAccessedAt')
      .lean()
      .exec();
    }
    }

module.exports = RecentService;