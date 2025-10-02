const { expect } = require('chai');

const { FolderController } = require('../controllers/FolderController');

describe('FolderController tests', () => {
    let folderService;
    let controller;
    let req;
    let res;

    let callLog;

    beforeEach(() => {
        callLog = [];

        folderService = {
        list: async () => { throw new Error('unassigned'); },
        create: async () => { throw new Error('unassigned'); },
        update: async () => { throw new Error('unassigned'); },
        remove: async () => { throw new Error('unassigned'); },
        };

        controller = new FolderController({ folderService });

        controller.ok = (response, payload) => {
        callLog.push({ method: 'ok', response, payload });
        return payload;
        };
        controller.created = (response, payload) => {
        callLog.push({ method: 'created', response, payload });
        return payload;
        };
        controller.handleError = (response, error) => {
        callLog.push({ method: 'handleError', response, error });
        return error;
        };

        req = {
        user: { id: 'user-123' },
        params: { id: 'folder-456' },
        body: { name: 'New Folder' },
        };
        res = {};
    });

    describe('getFolders', () => {
        it('should return ok with list results on success', async () => {
        const listResult = [{ id: '1', name: 'A' }];
        let receivedArgs;

        folderService.list = async (userId) => {
            receivedArgs = [userId];
            return listResult;
        };

        await controller.getFolders(req, res);

        expect(receivedArgs).to.deep.equal(['user-123']);

        expect(callLog.length).to.equal(1);
        expect(callLog[0].method).to.equal('ok');
        expect(callLog[0].response).to.equal(res);
        expect(callLog[0].payload).to.equal(listResult);
        });

        it('should call handleError when service throws', async () => {
        const err = new Error('boom');
        folderService.list = async () => { throw err; };

        await controller.getFolders(req, res);

        expect(callLog.length).to.equal(1);
        expect(callLog[0].method).to.equal('handleError');
        expect(callLog[0].response).to.equal(res);
        expect(callLog[0].error).to.equal(err);
        });
    });

    describe('createFolder', () => {
        it('should return created with new folder on success', async () => {
        const createdFolder = { id: '2', name: 'New Folder' };
        let receivedArgs;

        folderService.create = async (userId, body) => {
            receivedArgs = [userId, body];
            return createdFolder;
        };

        await controller.createFolder(req, res);

        expect(receivedArgs).to.deep.equal(['user-123', { name: 'New Folder' }]);

        expect(callLog.length).to.equal(1);
        expect(callLog[0].method).to.equal('created');
        expect(callLog[0].response).to.equal(res);
        expect(callLog[0].payload).to.equal(createdFolder);
        });

        it('should call handleError when service throws', async () => {
        const err = new Error('fail-create');
        folderService.create = async () => { throw err; };

        await controller.createFolder(req, res);

        expect(callLog.length).to.equal(1);
        expect(callLog[0].method).to.equal('handleError');
        expect(callLog[0].error).to.equal(err);
        });
    });

    describe('updateFolder', () => {
        it('should return ok with updated folder on success', async () => {
        const updated = { id: 'folder-456', name: 'Renamed' };
        let receivedArgs;
        req.body = { name: 'Renamed' };

        folderService.update = async (userId, folderId, body) => {
            receivedArgs = [userId, folderId, body];
            return updated;
        };

        await controller.updateFolder(req, res);

        expect(receivedArgs).to.deep.equal(['user-123', 'folder-456', { name: 'Renamed' }]);

        expect(callLog.length).to.equal(1);
        expect(callLog[0].method).to.equal('ok');
        expect(callLog[0].payload).to.equal(updated);
        });

        it('should call handleError when service throws', async () => {
        const err = new Error('fail-update');
        folderService.update = async () => { throw err; };

        await controller.updateFolder(req, res);

        expect(callLog.length).to.equal(1);
        expect(callLog[0].method).to.equal('handleError');
        expect(callLog[0].error).to.equal(err);
        });
    });

    describe('deleteFolder', () => {
        it('should return ok with delete result on success', async () => {
        const removed = { message: 'Folder deleted successfully' };
        let receivedArgs;

        folderService.remove = async (userId, folderId) => {
            receivedArgs = [userId, folderId];
            return removed;
        };

        await controller.deleteFolder(req, res);

        expect(receivedArgs).to.deep.equal(['user-123', 'folder-456']);

        expect(callLog.length).to.equal(1);
        expect(callLog[0].method).to.equal('ok');
        expect(callLog[0].payload).to.equal(removed);
        });

        it('should call handleError when service throws', async () => {
        const err = new Error('fail-remove');
        folderService.remove = async () => { throw err; };

        await controller.deleteFolder(req, res);

        expect(callLog.length).to.equal(1);
        expect(callLog[0].method).to.equal('handleError');
        expect(callLog[0].error).to.equal(err);
        });
    });
});
