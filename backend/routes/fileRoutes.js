const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createUploadMiddleware } = require('../utils/uploadFactory');

module.exports = ({ fileController }) => {
    const router = express.Router();
    const upload = createUploadMiddleware();

    router.get('/in-folder/:folderId', protect, fileController.listFilesInFolder.bind(fileController));
    router.get('/:fileId/download', protect, fileController.downloadFile.bind(fileController));
    router.get('/:fileId', protect, fileController.getFileDetails.bind(fileController))
    router.get('/:fileId/preview', protect, fileController.getPreview.bind(fileController))
    router.post('/in-folder/:folderId', protect, upload.single('file'), fileController.uploadFile.bind(fileController));
    router.post('/:fileId/share', protect, fileController.generatePublicUrl.bind(fileController));
    router.put('/:fileId', protect, fileController.renameFile.bind(fileController));
    router.delete('/:fileId', protect, fileController.deleteFile.bind(fileController));
    router.get('/folder/:folderId', protect, fileController.getFilesByFolderId.bind(fileController)); //For zipping files in a folder
    //router.get('/:fileId', protect, fileController.getFile.bind(fileController)); //For getting file metadata


    return router;
};