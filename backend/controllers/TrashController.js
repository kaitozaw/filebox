const BaseController = require('./BaseController')

class TrashController extends BaseController {
  constructor({ trashService }) {
    super()
    this.trashService = trashService
  }

  async listTrashes(req, res) {
    try {
      return this.ok(res, await this.trashService.list(req.user.id))
    } catch (err) {
      return this.handleError(res, err)
    }
  }

  async restoreTrash(req, res) {
    try {
      return this.ok(res, await this.trashService.restore(req.user.id, req.params.fileId))
    } catch (err) {
      return this.handleError(res, err)
    }
  }

  async purgeTrash(req, res) {
    try {
      return this.ok(res, await this.trashService.purge(req.user.id, req.params.fileId))
    } catch (err) {
      return this.handleError(res, err)
    }
  }
}

module.exports = { TrashController }
