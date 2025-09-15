// test/folderController.test.js
const { expect } = require('chai');
const { FolderController } = require('../controllers/FolderController');

// Mock folder service for manual injection
class MockFolderService {
    constructor() {
        this.calls = {};
    }

    list(userId) {
        this.calls.list = userId;
        return Promise.resolve(['folder1', 'folder2']);
    }

    getFolderById(userId, folderId) {
        this.calls.getFolderById = { userId, folderId };
        if (folderId === 'exists') {
        return Promise.resolve({ files: ['file1', 'file2'] });
        } else {
        return Promise.resolve(null);
        }
    }

    create(userId, body) {
        this.calls.create = { userId, body };
        return Promise.resolve({ name: 'Created' });
    }

    update(userId, folderId, body) {
        this.calls.update = { userId, folderId, body };
        return Promise.resolve({ updated: true });
    }

    remove(userId, folderId) {
        this.calls.remove = { userId, folderId };
        return Promise.resolve({ deleted: true });
    }
    }

    // Mock response object
    function createMockRes() {
    const res = {};
    res.statusCode = null;
    res.body = null;
    res.status = function (code) {
        this.statusCode = code;
        return this;
    };
    res.json = function (data) {
        this.body = data;
        return this;
    };
    return res;
    }

    describe('FolderController (Mocha + Chai only)', () => {
    let controller;
    let mockService;
    let req;
    let res;

    beforeEach(() => {
        mockService = new MockFolderService();
        controller = new FolderController({ folderService: mockService });
        res = createMockRes();
        req = {
        user: { id: 'user123' },
        params: { id: 'exists' },
        body: { name: 'Test Folder' }
        };
    });

    it('should list folders for a user', async () => {
        await controller.getFolders(req, res);
        expect(mockService.calls.list).to.equal('user123');
        expect(res.body).to.deep.equal(['folder1', 'folder2']);
    });

    it('should return folder files if folder exists', async () => {
        req.params.id = 'exists';
        await controller.getFolderById(req, res);
        expect(res.body).to.deep.equal({ files: ['file1', 'file2'] });
    });

    it('should return 404 if folder not found', async () => {
        req.params.id = 'nonexistent';
        await controller.getFolderById(req, res);
        expect(res.statusCode).to.equal(404);
        expect(res.body).to.deep.equal({ message: 'Folder not found' });
    });

    it('should create a folder', async () => {
        await controller.createFolder(req, res);
        expect(mockService.calls.create.userId).to.equal('user123');
        expect(res.statusCode).to.equal(201);
        expect(res.body).to.deep.equal({ name: 'Created' });
    });

    it('should update a folder', async () => {
        await controller.updateFolder(req, res);
        expect(res.body).to.deep.equal({ updated: true });
    });

    it('should delete a folder', async () => {
        await controller.deleteFolder(req, res);
        expect(res.body).to.deep.equal({ deleted: true });
    });
});
