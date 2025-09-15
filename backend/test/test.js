const chai = require('chai');
const { expect } = chai;
const mongoose = require('mongoose');
const sinon = require('sinon');

const Folder = require('../models/Folder'); 
const { createFolder } = require('../controllers/FolderController');

describe('createFolder Controller Test', () => {
    let createStub;

    afterEach(() => {
        if (createStub && createStub.restore) createStub.restore();
        sinon.restore();
    });

    it('should create a new folder successfully', async () => {
        const req = {
            user: { id: new mongoose.Types.ObjectId() },
            body: { name: 'My Folder' }
        };

        const createdAt = new Date();
        const createdFolder = {
            _id: new mongoose.Types.ObjectId(),
            user: req.user.id,
            name: req.body.name,
            createdAt
        };
    
        createStub = sinon.stub(Folder, 'create').resolves(createdFolder);

        const res = {
            status: sinon.stub().returnsThis(),
            json: sinon.spy()
        };

        await createFolder(req, res);

        expect(createStub.calledOnceWith({ name: req.body.name, user: req.user.id })).to.be.true;
        expect(res.status.calledWith(201)).to.be.true;
        expect(res.json.calledWith({
            id: createdFolder._id,
            name: createdFolder.name,
            user: createdFolder.user,
            createdAt: createdFolder.createdAt
        })).to.be.true;
    });

    it('should return 400 if name is missing', async () => {
        const req = {
            user: { id: new mongoose.Types.ObjectId() },
            body: { }
        };

        createStub = sinon.stub(Folder, 'create');

        const res = {
            status: sinon.stub().returnsThis(),
            json: sinon.spy()
        };

        await createFolder(req, res);

        expect(res.status.calledWith(400)).to.be.true;
        expect(res.json.calledWithMatch({ message: 'Folder name is required' })).to.be.true;
        expect(createStub.notCalled).to.be.true;
    });

    it('should return 500 if an error occurs', async () => {
        createStub = sinon.stub(Folder, 'create').throws(new Error('DB Error'));

        const req = {
            user: { id: new mongoose.Types.ObjectId() },
            body: { name: 'Err Folder' }
        };

        const res = {
            status: sinon.stub().returnsThis(),
            json: sinon.spy()
        };

        await createFolder(req, res);

        expect(res.status.calledWith(500)).to.be.true;
        expect(res.json.calledWithMatch({ message: 'DB Error' })).to.be.true;
    });
});