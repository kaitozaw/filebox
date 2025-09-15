const express = require('express')
const { protect } = require('../middleware/authMiddleware')

function buildTrashRoutes({ trashController }) {
  const router = express.Router()

  router.use(protect)

  router.get('/', trashController.listTrashes.bind(trashController))

  router.post('/:fileId/restore', trashController.restoreTrash.bind(trashController))

  router.delete('/:fileId', trashController.purgeTrash.bind(trashController))

  return router
}

module.exports = buildTrashRoutes