const express = require('express');
const { getFolders, createFolder, updateFolder, deleteFolder } = require('../controllers/folderController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, getFolders);
router.post('/', protect, createFolder);
router.put('/:id', protect, updateFolder);
router.delete('/:id', protect, deleteFolder);

module.exports = router;