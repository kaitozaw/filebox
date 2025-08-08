const express = require('express');
const { accessPublicFile } = require('../controllers/fileController');
const router = express.Router();

router.get('/:publicId', accessPublicFile);

module.exports = router;