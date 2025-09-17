const express = require('express')
const { protect } = require('../middleware/authMiddleware')

module.exports = ({ trashController }) => {
    const router = express.Router();

    router.get('/', protect, trashController.listTrashes.bind(trashController))
    router.post('/:fileId/restore', protect, trashController.restoreTrash.bind(trashController))
    router.delete('/:fileId', protect, trashController.purgeTrash.bind(trashController))

    return router;
};