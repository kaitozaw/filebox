const fs = require('fs');
const path = require('path');
const StorageStrategy = require('./StorageStrategy');

class LocalStorage extends StorageStrategy {
    constructor({ baseDir = path.resolve(__dirname, '..', '..', 'uploads') } = {}) {
        super();
        this.baseDir = baseDir;
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
    }

    async save({ uploaded }) {
        if (!uploaded || !uploaded.path) {
            throw new Error('LocalStorage.save: uploaded file is missing');
        }
        const rel = path.join('uploads', path.basename(uploaded.path));
        return {
            downloadName: uploaded.originalname,
            size: typeof uploaded.size === 'number' ? uploaded.size : 0,
            mimetype: uploaded.mimetype,
            filePath: rel,
        };
    }

    stream(filePathRel) {
        const abs = path.isAbsolute(filePathRel)
            ? filePathRel
            : path.resolve(this.baseDir, path.basename(filePathRel));

        if (!fs.existsSync(abs)) {
            const err = new Error('File not found on server');
            err.code = 'ENOENT';
            throw err;
        }
        return { stream: fs.createReadStream(abs) };
    }

    async remove(filePathRel) {
        const abs = path.isAbsolute(filePathRel)
            ? filePathRel
            : path.resolve(this.baseDir, path.basename(filePathRel));

        if (fs.existsSync(abs)) {
            await fs.promises.unlink(abs);
        }
    }
}

module.exports = LocalStorage;