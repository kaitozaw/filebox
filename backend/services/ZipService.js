// backend/services/ZipService.js
const archiver = require('archiver');
const { PassThrough } = require('stream');
const EventEmitter = require('events');


class ZipService extends EventEmitter {
    constructor({ fileService, folderService }) {
        super();
        this.fileService = fileService;
        this.folderService = folderService;
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

        // Emit event for observers (AuditService, LoggerService, QuotaService, etc.)
        this.emit('ZIP_CREATED', {
        folderId: folder._id,
        userId: folder.user,
        fileCount: files.length,
        timestamp: new Date(),
        });

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
