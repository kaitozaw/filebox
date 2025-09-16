const archiver = require('archiver');
const EventEmitter = require('events');
const { PassThrough } = require('stream');

class ZipService extends EventEmitter {
    constructor({ fileService }) {
        super();
        this.fileService = fileService;
    }

    async zipFolder({ folder, files }) {
        const passthrough = new PassThrough();
        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', (err) => passthrough.emit('error', err));
        archive.pipe(passthrough);
        for (const file of files) {
            const stream = await this.fileService.getFileStream(file);
            archive.append(stream, { name: file.name });
        }
        archive.finalize();

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