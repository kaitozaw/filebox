const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createUploadMiddleware } = require('../utils/uploadFactory');

module.exports = ({ fileController }) => {
    const router = express.Router();
    const upload = createUploadMiddleware();

    router.get('/in-folder/:folderId', protect, fileController.listFilesInFolder.bind(fileController));
    router.get('/:fileId/download', protect, fileController.downloadFile.bind(fileController));
    router.post('/in-folder/:folderId', protect, upload.single('file'), fileController.uploadFile.bind(fileController));
    router.post('/:fileId/share', protect, fileController.generatePublicUrl.bind(fileController));
    router.put('/:fileId', protect, fileController.renameFile.bind(fileController));
    router.delete('/:fileId', protect, fileController.deleteFile.bind(fileController));

    return router;
};