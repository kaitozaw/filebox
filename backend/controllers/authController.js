const BaseController = require('./BaseController');

class AuthController extends BaseController {
    constructor({ userService }) {
        super();
        this.userService = userService;
    }

    async register(req, res) {
        try { return this.created(res, await this.userService.register(req.body)); }
        catch (err) { return this.handleError(res, err); }
    }

    async login(req, res) {
        try { return this.ok(res, await this.userService.login(req.body)); }
        catch (err) { return this.handleError(res, err); }
    }

    async profile(req, res) {
        try { return this.ok(res, await this.userService.getProfile(req.user.id)); }
        catch (err) { return this.handleError(res, err); }
    }

    async updateProfile(req, res) {
        try { return this.ok(res, await this.userService.updateProfile(req.user.id, req.body)); }
        catch (err) { return this.handleError(res, err); }
    }
}

module.exports = { AuthController };