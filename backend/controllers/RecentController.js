const BaseController = require('./BaseController');
const RecentService = require('../services/RecentService');

class RecentController extends BaseController {
    constructor({ recentService = new RecentService() } = {}) {
        super();
        this.recentService = recentService;
    }

    async getRecent(req, res) {
        try { return this.ok(res, await this.recentService.listByUser(req.user.id)); }
        catch (err) { return this.handleError(res, err); }
    }
}

module.exports = { RecentController };