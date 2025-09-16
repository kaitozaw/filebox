const BaseController = require('./BaseController');
const contentDisposition = require('content-disposition');

class ZipController extends BaseController {
    constructor({ zipServiceProxy }) {
        super();
        this.zipServiceProxy = zipServiceProxy;
    }

    async zipFolder(req, res) {
        try {
            const { stream, filename, headers } = await this.zipServiceProxy.zipFolder({
                userId: req.user.id,
                folderId: req.params.id,
                fileIds: req.query.files ? req.query.files.split(',') : [],
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
            return this.handleError(res, err);
        }
    }
}

module.exports = { ZipController };
