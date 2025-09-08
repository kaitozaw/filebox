const contentDisposition = require('content-disposition');

class ZipController {
    constructor({ zipService }) {
        this.zipService = zipService;
    }

    async downloadFolderZip(req, res) {
        try {
            const userId = req.user.id;
            const folderId = req.params.id;
            const fileIds = req.query.files ? req.query.files.split(',') : [];

            const { stream, filename, headers } = await this.zipService.zipFolder({
                userId,
                folderId,
                fileIds,
            });

            res.setHeader('Content-Type', headers['Content-Type']);
            res.setHeader('Content-Disposition', contentDisposition(filename));
            stream.pipe(res);
        } catch (err) {
            console.error('ZipController Error:', err);

            // Known validation / permission errors
            if (err.name === 'PermissionError') {
                return res.status(403).json({ error: true, message: err.message });
            }
            if (err.name === 'ValidationError') {
                return res.status(400).json({ error: true, message: err.message });
            }

            // Fallback for unexpected issues
            res.status(500).json({ error: true, message: 'Internal Server Error' });
        }
    }
}

module.exports = { ZipController };
