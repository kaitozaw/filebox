const express = require('express');
const { protect } = require('../middleware/authMiddleware');

module.exports = ({ folderController, zipController }) => {
    const router = express.Router();

    router.get('/', protect, folderController.getFolders.bind(folderController));
    router.post('/', protect, folderController.createFolder.bind(folderController));
    router.put('/:id', protect, folderController.updateFolder.bind(folderController));
    router.delete('/:id', protect, folderController.deleteFolder.bind(folderController));
    
     // ZIP route: use zipController
    router.get('/:id/zip', protect, zipController.downloadFolderZip.bind(zipController));
    router.get('/:id', protect, folderController.getFolderById.bind(folderController));



    return router;
};