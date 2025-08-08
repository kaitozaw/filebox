
const express = require('express');
const { listFilesInFolder, uploadFile, upload, downloadFile } = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/in-folder/:folderId', protect, listFilesInFolder);
router.post('/in-folder/:folderId', protect, upload.single('file'), uploadFile);
router.get('/:fileId/download', protect, downloadFile);

module.exports = router;