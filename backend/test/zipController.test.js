const { expect } = require('chai');
const { PassThrough, Writable } = require('stream');
const { ZipController } = require('../controllers/ZipController');

// 🛠 Create a mock writable response stream
function createMockRes() {
    const res = new Writable({
        write(chunk, encoding, callback) {
            callback(); // allow writing
        }
    });
    res.headers = {};
    res.statusCode = 200;
    res.setHeader = (key, value) => {
        res.headers[key] = value;
    };
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.body = data;
        return res;
    };
    res.destroy = (err) => {
        res.destroyed = true;
        res.destroyError = err;
    };
    return res;
}

describe('ZipController', () => {
    it('should set headers and pipe stream on successful download', async () => {
        // Arrange
        const mockStream = new PassThrough();
        mockStream.end('Mock zip data');

        const zipAccessProxyMock = {
            zipFolder: async ({ userId, folderId, fileIds }) => {
                return {
                    stream: mockStream,
                    filename: 'mockfile.zip',
                    headers: {
                        'Content-Type': 'application/zip'
                    }
                };
            }
        };

        const controller = new ZipController({ zipAccessProxy: zipAccessProxyMock });

        const req = {
            user: { id: 'user123' },
            params: { id: 'folder123' },
            query: { files: 'a,b,c' }
        };

        const res = createMockRes(); // Mock response

        // Act
        await controller.downloadFolderZip(req, res);

        // Assert
        expect(res.headers['Content-Type']).to.equal('application/zip');
        expect(res.headers['Content-Disposition']).to.contain('mockfile.zip');
    });
});
