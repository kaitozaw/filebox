// test/zipService.test.js
const { expect } = require('chai');
const { PassThrough } = require('stream');
const ZipService = require('../services/ZipService');

describe('ZipService', () => {
    let zipService;
    let fileServiceMock;
    let folderServiceMock;

    beforeEach(() => {
        // Manually mock fileService
        fileServiceMock = {
            getFileStream: (file) => {
                const stream = new PassThrough();
                stream.end(`Contents of ${file.name}`);
                return stream;
            }
        };

        folderServiceMock = {}; // Not used in zipFolder

        zipService = new ZipService({ fileService: fileServiceMock, folderService: folderServiceMock });
    });

    it('should emit ZIP_CREATED event with correct payload', (done) => {
        const folder = { _id: 'folder123', name: 'TestFolder', user: 'user456' };
        const files = [
            { _id: '1', name: 'file1.txt' },
            { _id: '2', name: 'file2.txt' }
        ];

        zipService.once('ZIP_CREATED', (eventPayload) => {
            try {
                expect(eventPayload).to.include({
                    folderId: folder._id,
                    userId: folder.user,
                    fileCount: files.length
                });
                expect(eventPayload.timestamp).to.be.an.instanceOf(Date);
                done();
            } catch (err) {
                done(err);
            }
        });

        zipService.zipFolder({ folder, files });
    });

    it('should return a valid zip stream response', async () => {
        const folder = { _id: 'folder456', name: 'SampleFolder', user: 'user789' };
        const files = [
            { _id: '1', name: 'sample1.txt' },
            { _id: '2', name: 'sample2.txt' }
        ];

        const result = await zipService.zipFolder({ folder, files });

        expect(result).to.have.property('stream');
        expect(result).to.have.property('filename', 'SampleFolder.zip');
        expect(result.headers['Content-Type']).to.equal('application/zip');
    });

    it('should append each file stream to the archive', async () => {
        const folder = { _id: 'folder789', name: 'MyFolder', user: 'user001' };
        const files = [
            { _id: 'a', name: 'doc1.txt' },
            { _id: 'b', name: 'doc2.txt' },
            { _id: 'c', name: 'doc3.txt' }
        ];

        let callCount = 0;
        const calledFiles = [];

        // Override getFileStream to capture calls
        zipService.fileService.getFileStream = (file) => {
            callCount++;
            calledFiles.push(file);
            const stream = new PassThrough();
            stream.end(`Content for ${file.name}`);
            return stream;
        };

        await zipService.zipFolder({ folder, files });

        expect(callCount).to.equal(3);
        expect(calledFiles).to.deep.equal(files);
    });
});