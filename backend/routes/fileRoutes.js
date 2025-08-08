const express = require('express');
const { listFilesInFolder, downloadFile, upload, uploadFile, generatePublicUrl, renameFile, deleteFile } = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/in-folder/:folderId', protect, listFilesInFolder);
router.get('/:fileId/download', protect, downloadFile);
router.post('/in-folder/:folderId', protect, upload.single('file'), uploadFile);
router.post('/:fileId/share', protect, generatePublicUrl);
router.put('/:fileId', protect, renameFile);
router.delete('/:fileId', protect, deleteFile);

module.exports = router;