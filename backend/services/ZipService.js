// /backend/services/ZipService.js
const archiver = require('archiver');
const { Readable } = require('stream');
const mongoose = require('mongoose');

class ZipService {
    constructor({ fileService, folderService }) {
        this.fileService = fileService;
        this.folderService = folderService;
        this.MAX_FILES = 5;
    }

    /**
     * Facade method: wraps file lookup, permission checks, and zip streaming
     */
    async zipFolder({ userId, folderId }) {
        // --- Proxy Guard: check folder ownership ---
        const folder = await this.folderService.getFolderById(folderId);
        if (!folder) {
            const err = new Error('Folder not found');
            err.statusCode = 404;
            throw err;
        }
        if (String(folder.owner) !== String(userId)) {
            const err = new Error('Permission: You do not have ownership of these files');
            err.statusCode = 403;
            throw err;
        }

        // --- Fetch files from folder (MongoDB) ---
        const files = await this.fileService.getFilesByFolder(folderId);

        if (!files || files.length === 0) {
            const err = new Error('No files found in this folder');
            err.statusCode = 404;
            throw err;
        }

        // --- Proxy Guard: enforce max file count ---
        if (files.length > this.MAX_FILES) {
            const err = new Error(`Maximum number of files to zip is ${this.MAX_FILES}`);
            err.statusCode = 400;
            throw err;
        }

        // --- Create archive stream ---
        const archive = archiver('zip', { zlib: { level: 9 } });

        // Add each file stream to archive
        for (const file of files) {
            // Assume fileService.getFileStream(file) returns a Readable stream (e.g., from GridFS or local storage)
            const fileStream = await this.fileService.getFileStream(file);
            if (!(fileStream instanceof Readable)) {
                const err = new Error(`Failed to read file: ${file.originalName}`);
                err.statusCode = 500;
                throw err;
            }
            archive.append(fileStream, { name: file.originalName });
        }

        archive.finalize();

        const filename = `folder-${folderId}.zip`;
        const headers = {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${filename}"`,
        };

        return { stream: archive, filename, headers };
    }
}

module.exports = ZipService;
