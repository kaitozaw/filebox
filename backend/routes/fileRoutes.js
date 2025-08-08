
const express = require('express');
const { listFilesInFolder, uploadFile, upload } = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/in-folder/:folderId', protect, listFilesInFolder);
router.post('/in-folder/:folderId', protect, upload.single('file'), uploadFile);

module.exports = router;