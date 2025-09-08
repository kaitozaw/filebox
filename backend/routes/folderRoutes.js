const express = require('express');
const { protect } = require('../middleware/authMiddleware');

module.exports = ({ folderController }) => {
    const router = express.Router();

    router.get('/', protect, folderController.getFolders.bind(folderController));
    router.post('/', protect, folderController.createFolder.bind(folderController));
    router.put('/:id', protect, folderController.updateFolder.bind(folderController));
    router.delete('/:id', protect, folderController.deleteFolder.bind(folderController));
    router.get('/:id/zip', protect, folderController.downloadFolderZip.bind(folderController));

    return router;
};