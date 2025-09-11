const contentDisposition = require('content-disposition');

class ZipController {
    constructor({ zipAccessProxy }) {
        this.zipAccessProxy = zipAccessProxy;
    }

    async downloadFolderZip(req, res) {
        try {
            const userId = req.user.id;
            const folderId = req.params.id;
            const fileIds = req.query.files ? req.query.files.split(',') : [];

            // Call through the proxy (access guard + service)
            const { stream, filename, headers } = await this.zipAccessProxy.zipFolder({
                userId,
                folderId,
                fileIds,
            });

            res.setHeader('Content-Type', headers['Content-Type']);
            res.setHeader('Content-Disposition', contentDisposition(filename));

            stream.on('error', (err) => {
                console.error('Stream error:', err);
                if (!res.headersSent) {
                return res.status(500).json({ error: true, message: 'ZIP stream failed' });
                }
                res.destroy(err);
            });

            stream.pipe(res);
        } catch (err) {
        console.error('ZipController Error:', err);

            if (err.name === 'PermissionError') {
                return res.status(403).json({ error: true, message: err.message });
            }
            if (err.name === 'ValidationError' || err.name === 'QuotaError') {
                return res.status(400).json({ error: true, message: err.message });
            }
            if (err.name === 'QuotaError') {
                return res.status(429).json({
                    error: true,
                    message: 'You have reached your download quota. Please wait before trying again.'
                });
                }

            res.status(500).json({ error: true, message: 'Internal Server Error' });
        }
    }
}

module.exports = { ZipController };
