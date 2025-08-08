
const express = require('express');
const { listFilesInFolder, downloadFile, uploadFile, upload, renameFile, deleteFile } = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/in-folder/:folderId', protect, listFilesInFolder);
router.get('/:fileId/download', protect, downloadFile);
router.post('/in-folder/:folderId', protect, upload.single('file'), uploadFile);
router.put('/:fileId', protect, renameFile);
router.delete('/:fileId', protect, deleteFile);

module.exports = router;