// backend/services/ZipService.js
const archiver = require('archiver');
const { PassThrough } = require('stream');

class ZipService {
    constructor({ fileService }) {
        this.fileService = fileService;
    }

    async zipFolder({ folder, files }) {
        // Setup ZIP stream
        const passthrough = new PassThrough();
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('error', (err) => passthrough.emit('error', err));
        archive.pipe(passthrough);

        // Append files to archive
        for (const file of files) {
        const stream = await this.fileService.getFileStream(file);
        archive.append(stream, { name: file.name });
        }

        archive.finalize();

        return {
        stream: passthrough,
        filename: `${folder.name}.zip`,
        headers: {
            'Content-Type': 'application/zip',
        },
        };
    }
}

module.exports = ZipService;
