
const express = require('express');
const { listFilesInFolder } = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/in-folder/:folderId', protect, listFilesInFolder);

module.exports = router;