// test/zipAccessProxy.test.js
const { expect } = require('chai');
const ZipAccessProxy = require('../services/ZipAccessProxy');

// Mock data
const mockFolder = { _id: 'folder1', name: 'TestFolder', user: 'user1' };
const mockFiles = [
    { _id: '1', name: 'file1.txt' },
    { _id: '2', name: 'file2.txt' },
    { _id: '3', name: 'file3.txt' }
    ];

    describe('ZipAccessProxy', () => {
    let zipProxy;
    let zipService;
    let folderService;
    let fileService;
    let quotaService;

    beforeEach(() => {
        zipService = {
        zipFolder: async ({ folder, files }) => ({ success: true, folder, files })
        };

        folderService = {
        getFolderById: async (id) => (id === mockFolder._id ? mockFolder : null)
        };

        fileService = {
        getFilesByFolder: async (userId, folderId) => mockFiles
        };

        quotaService = {
        checkQuota: async (userId) => ({ overQuota: false }),
        logZipDownload: async () => {}
        };

        zipProxy = new ZipAccessProxy({ zipService, folderService, fileService, quotaService });
    });

    it('should return zipped files when valid request is made', async () => {
        const result = await zipProxy.zipFolder({
        userId: 'user1',
        folderId: 'folder1',
        fileIds: ['1', '2']
        });

        expect(result.success).to.be.true;
        expect(result.files.length).to.equal(2);
    });

    it('should throw PermissionError if user does not own the folder', async () => {
        try {
        await zipProxy.zipFolder({ userId: 'wrongUser', folderId: 'folder1' });
        } catch (err) {
        expect(err.name).to.equal('PermissionError');
        }
    });

    it('should throw QuotaError if quota is exceeded', async () => {
        quotaService.checkQuota = async () => ({ overQuota: true, count: 3, limit: 3, windowMinutes: 1 });
        try {
        await zipProxy.zipFolder({ userId: 'user1', folderId: 'folder1' });
        } catch (err) {
        expect(err.name).to.equal('QuotaError');
        expect(err.details.overQuota).to.be.true;
        }
    });

    it('should throw ValidationError if file limit exceeds 5', async () => {
        fileService.getFilesByFolder = async () => [
        ...mockFiles,
        { _id: '4', name: 'file4.txt' },
        { _id: '5', name: 'file5.txt' },
        { _id: '6', name: 'file6.txt' }
        ];

        try {
        await zipProxy.zipFolder({ userId: 'user1', folderId: 'folder1' });
        } catch (err) {
        expect(err.name).to.equal('ValidationError');
        }
    });
});