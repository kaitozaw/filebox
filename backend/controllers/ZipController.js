// /backend/controllers/ZipController.js
class ZipController {
    constructor({ zipService }) {
        this.zipService = zipService;
    }

    /**
     * Controller method: handles GET /:id/zip
     */
    async downloadFolderZip(req, res, next) {
        try {
            const userId = req.user.id; // populated by auth middleware
            const folderId = req.params.id;

            const { stream, headers } = await this.zipService.zipFolder({
                userId,
                folderId,
            });

            // Apply headers
            Object.entries(headers).forEach(([key, value]) => {
                res.setHeader(key, value);
            });

            // Pipe archive stream to response
            stream.pipe(res);
        } catch (err) {
            // Graceful error handling
            if (err.statusCode) {
                res.status(err.statusCode).json({ message: err.message });
            } else {
                console.error('ZIP error:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            }
        }
    }
}

module.exports = { ZipController };
