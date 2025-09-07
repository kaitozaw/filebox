const express = require('express');

module.exports = ({ fileController }) => {
    const router = express.Router();

    router.get('/:publicId', fileController.accessPublicFile.bind(fileController));

    return router;
};