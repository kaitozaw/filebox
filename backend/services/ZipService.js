// backend/services/ZipService.js
const archiver = require('archiver');
const { PassThrough } = require('stream');

class ZipService {
    constructor({ fileService }) {
        this.fileService = fileService;
    }

    async zipFolder({ userId, folderId, fileIds }) {
        // Get files inside the folder
        const files = await this.fileService.getFilesByFolder(userId, folderId);

        // If user selected specific files, filter them
        let selectedFiles = files;
        if (fileIds.length > 0) {
            selectedFiles = files.filter(f => fileIds.includes(f._id.toString()));
        }

        // Enforce max file limit (5 files)
        if (selectedFiles.length > 5) {
            const err = new Error('Validation: Maximum number of files to zip is 5.');
            err.name = 'ValidationError';
            throw err;
        }

        // Setup ZIP stream
        const passthrough = new PassThrough();
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('error', (err) => {
        passthrough.emit('error', err);
        });

        archive.pipe(passthrough);

        // Append files
        for (const file of selectedFiles) {
            const stream = await this.fileService.getFileStream(file);
            archive.append(stream, { name: file.name });
        }

        archive.finalize();

        return {
            stream: passthrough,
            filename: `folder-${folderId}.zip`,
            headers: { 'Content-Type': 'application/zip' },
        };
    }
}

module.exports = ZipService;
