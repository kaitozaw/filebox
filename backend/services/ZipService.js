const archiver = require('archiver');
const { PassThrough } = require('stream');

class ZipService {
    constructor({ fileService, folderService }) {
        this.fileService = fileService;
        this.folderService = folderService;
    }

    async zipFolder({ userId, folderId, fileIds }) {
        // Verify folder ownership
        const folder = await this.folderService.getFolderById(folderId);
        if (!folder || folder.owner.toString() !== userId) {
            const err = new Error('Permission: You do not have ownership of these files.');
            err.name = 'PermissionError';
            throw err;
        }

        // Get files inside the folder
        const files = await this.fileService.getFilesByFolderId(folderId);

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
            throw err;
        });

        archive.pipe(passthrough);

        // Append files to archive
        for (const file of selectedFiles) {
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
