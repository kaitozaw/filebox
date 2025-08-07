
const express = require('express');
const { getFolders, createFolder } = require('../controllers/folderController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, getFolders);
router.post('/', protect, createFolder);

module.exports = router;