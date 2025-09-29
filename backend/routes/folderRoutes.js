const express = require('express');
const { protect } = require('../middleware/authMiddleware');

module.exports = ({ folderController, zipController }) => {
    const router = express.Router();

    router.get('/', protect, folderController.getFolders.bind(folderController));
    router.get('/:id/zip', protect, zipController.zipFolder.bind(zipController));
    router.post('/', protect, folderController.createFolder.bind(folderController));
    router.put('/:id', protect, folderController.updateFolder.bind(folderController));
    router.delete('/:id', protect, folderController.deleteFolder.bind(folderController));
    
    return router;
};