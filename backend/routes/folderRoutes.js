
const express = require('express');
const { getFolders, createFolder, updateFolder } = require('../controllers/folderController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, getFolders);
router.post('/', protect, createFolder);
router.put('/:id', protect, updateFolder);

module.exports = router;