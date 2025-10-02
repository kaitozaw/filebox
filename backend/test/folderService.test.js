const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

describe('FolderService tests', () => {
    let FolderMock;
    let FolderService;
    let service;

    const {
        ValidationError,
        ForbiddenError,
        NotFoundError,
    } = require('../utils/errors'); 

    const now = new Date();
    const mkDoc = ({ id = 'folder-1', name = 'Folder A', user = 'user-123', createdAt = now } = {}) => ({
        _id: id,
        name,
        user,
        createdAt,
        save: sinon.stub().resolvesThis(),
        deleteOne: sinon.stub().resolves(),
    });

    beforeEach(() => {
        FolderMock = {
        find: sinon.stub(),
        findById: sinon.stub(),
        create: sinon.stub(),
        };

        FolderService = proxyquire('../services/FolderService', {
        '../models/Folder': FolderMock,
        });

        service = new FolderService();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('list', () => {
        it('should return mapped folders in reverse chronological order', async () => {
        const docs = [
            mkDoc({ id: '2', name: 'B', createdAt: new Date('2024-12-31') }),
            mkDoc({ id: '1', name: 'A', createdAt: new Date('2024-01-01') }),
        ];

        const sortStub = sinon.stub().resolves(docs);
        FolderMock.find.returns({ sort: sortStub });

        const result = await service.list('user-123');

        expect(FolderMock.find.calledOnceWithExactly({ user: 'user-123' })).to.be.true;
        expect(sortStub.calledOnceWithExactly({ createdAt: -1 })).to.be.true;
        expect(result).to.deep.equal([
            { id: '2', name: 'B', user: docs[0].user, createdAt: docs[0].createdAt },
            { id: '1', name: 'A', user: docs[1].user, createdAt: docs[1].createdAt },
        ]);
        });
    });

    describe('getFolderById', () => {
        it('should return folder when found', async () => {
        const doc = mkDoc({ id: 'folder-9' });
        FolderMock.findById.resolves(doc);

        const out = await service.getFolderById('folder-9');

        expect(FolderMock.findById.calledOnceWithExactly('folder-9')).to.be.true;
        expect(out).to.equal(doc);
        });

        it('should throw NotFoundError when not found', async () => {
        FolderMock.findById.resolves(null);

        try {
            await service.getFolderById('missing');
            expect.fail('Expected NotFoundError to be thrown');
        } catch (err) {
            expect(err.name).to.equal('NotFoundError');
            expect(err.message).to.match(/Folder not found/i);
        }
        });
    });

    describe('create', () => {
        it('should throw ValidationError when file name is missing', async () => {
        try {
            await service.create('user-123', { });
            expect.fail('Expected ValidationError to be thrown');
        } catch (err) {
            expect(err.name).to.equal('ValidationError');
            expect(err.message).to.match(/name is required/i);
        }
        });

        it('should create and return mapped folder', async () => {
        const created = mkDoc({ id: 'new-1', name: 'New Folder', user: 'user-123' });
        FolderMock.create.resolves(created);

        const out = await service.create('user-123', { name: 'New Folder' });

        expect(FolderMock.create.calledOnceWithExactly({ name: 'New Folder', user: 'user-123' })).to.be.true;
        expect(out).to.deep.equal({
            id: created._id,
            name: created.name,
            user: created.user,
            createdAt: created.createdAt,
        });
        });
    });

    describe('update', () => {
        it('should throw ValidationError when folder name is missing', async () => {
        try {
            await service.update('user-123', 'folder-1', { });
            expect.fail('Expected ValidationError to be thrown');
        } catch (err) {
            expect(err.name).to.equal('ValidationError');
            expect(err.message).to.match(/name is required/i);
        }
        });

        it('should throw NotFoundError when folder is not found', async () => {
        FolderMock.findById.resolves(null);

        try {
            await service.update('user-123', 'missing', { name: 'Renamed' });
            expect.fail('Expected NotFoundError to be thrown');
        } catch (err) {
            expect(err.name).to.equal('NotFoundError');
            expect(err.message).to.match(/Folder not found/i);
        }
        });

        it('should throw ForbiddenError for non-owner', async () => {
        const doc = mkDoc({ user: 'other-user' });
        FolderMock.findById.resolves(doc);

        try {
            await service.update('user-123', 'folder-1', { name: 'Renamed' });
            expect.fail('Expected ForbiddenError to be thrown');
        } catch (err) {
            expect(err.name).to.equal('ForbiddenError');
            expect(err.message).to.match(/Not authorized/i);
        }
        });

        it('should update and return mapped folder for owner', async () => {
        const doc = mkDoc({ id: 'folder-1', name: 'Old', user: 'user-123' });
        const saved = mkDoc({ id: 'folder-1', name: 'Renamed', user: 'user-123' });

        doc.save.resolves(saved);
        FolderMock.findById.resolves(doc);

        const out = await service.update('user-123', 'folder-1', { name: 'Renamed' });

        expect(FolderMock.findById.calledOnceWithExactly('folder-1')).to.be.true;
        expect(doc.name).to.equal('Renamed');
        expect(doc.save.calledOnce).to.be.true;
        expect(out).to.deep.equal({
            id: saved._id,
            name: saved.name,
            user: saved.user,
            createdAt: saved.createdAt,
        });
        });
    });

    describe('remove', () => {
        it('should throw NotFoundError when folder is missing', async () => {
        FolderMock.findById.resolves(null);

        try {
            await service.remove('user-123', 'missing');
            expect.fail('Expected NotFoundError to be thrown');
        } catch (err) {
            expect(err.name).to.equal('NotFoundError');
            expect(err.message).to.match(/Folder not found/i);
        }
        });

        it('should throw ForbiddenError for non-owner', async () => {
        const doc = mkDoc({ user: 'other-user' });
        FolderMock.findById.resolves(doc);

        try {
            await service.remove('user-123', 'folder-1');
            expect.fail('Expected ForbiddenError to be thrown');
        } catch (err) {
            expect(err.name).to.equal('ForbiddenError');
            expect(err.message).to.match(/Not authorized/i);
        }
        });

        it('should delete and return confirmation for owner', async () => {
        const doc = mkDoc({ id: 'folder-1', user: 'user-123' });
        FolderMock.findById.resolves(doc);

        const out = await service.remove('user-123', 'folder-1');

        expect(FolderMock.findById.calledOnceWithExactly('folder-1')).to.be.true;
        expect(doc.deleteOne.calledOnce).to.be.true;
        expect(out).to.deep.equal({ message: 'Folder deleted successfully' });
        });
    });
});
