
const express = require('express');
const { getFolders } = require('../controllers/folderController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, getFolders);

module.exports = router;