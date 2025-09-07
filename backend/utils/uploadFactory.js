const multer = require('multer');
const path = require('path');
const fs = require('fs');

function createUploadMiddleware() {
    const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const storage = multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
        filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
    });
    return multer({ storage });
}

module.exports = { createUploadMiddleware };