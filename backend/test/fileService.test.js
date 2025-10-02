const assert = require('node:assert/strict');
const { expect } = require('chai');
const sinon = require('sinon');
const stream = require('stream');

const File = require('../models/File');
const FileService = require('../services/FileService');
const Folder = require('../models/Folder');

describe('FileService tests', () => {
  let storage, svc;
  const u1 = '1234567890abcdefghijklmn';
  const f1 = 'abcdefghijklmn1234567890';

  beforeEach(() => {
    storage = { save: sinon.stub(), stream: sinon.stub() };
    svc = new FileService({ storage });
  });

  afterEach(() => sinon.restore());

  describe('listInFolder()', () => {
    it('should return existing files from own folder', async () => {
      sinon.stub(Folder, 'findById').resolves({ _id: f1, user: u1 });
      const files = [{ name: 'a' }, { name: 'b' }];
      const sort = sinon.stub().returns(files);
      const findStub = sinon.stub(File, 'find').returns({ sort });

      const res = await svc.listInFolder(u1, f1);
      expect(findStub.calledOnce).to.be.true;
      expect(res).to.have.length(2);
    });

    it('should reject when folder not found', async () => {
      sinon.stub(Folder, 'findById').resolves(null);
      await assert.rejects(() => svc.listInFolder(u1, f1), { message: 'Folder not found' });
    });

    it('should reject when the folder belongs to another user', async () => {
      sinon.stub(Folder, 'findById').resolves({ _id: f1, user: 'other' });
      await assert.rejects(() => svc.listInFolder(u1, f1), /Not authorized/);
    });
  });

  describe('download()', () => {
    it('should return stream and headers', async () => {
      sinon.stub(File, 'findById').resolves({
        _id: 'file1', user: u1, name: 'a.pdf', size: 2, mimetype: 'text/plain', filePath: '/data/a.pdf'
      });
      const s = new stream.PassThrough();
      storage.stream.returns({ stream: s });

      sinon.stub(svc, 'buildDownloadHeaders').returns({
        'Content-Type': 'text/plain',
        'Content-Length': 2
      });

      const { stream: st, headers } = await svc.download(u1, 'file1');
      expect(st).to.equal(s);
      expect(headers).to.be.an('object');
      expect(headers['Content-Type']).to.equal('text/plain');
    });
  });

  describe('uploadToFolder()', () => {
    it('should save via storage and creates File document', async () => {
      sinon.stub(Folder, 'findById').resolves({ _id: f1, user: u1 });
      storage.save.resolves({
        downloadName: 'test.pdf', size: 35, mimetype: 'application/pdf', filePath: '/data/u1/test.pdf'
      });
      const created = { _id: 'fileX', name: 'test.pdf' };
      const createStub = sinon.stub(File, 'create').resolves(created);

      const file = await svc.uploadToFolder(u1, f1, { originalname: 'x' });
      expect(createStub.calledOnce).to.be.true;
      expect(file).to.deep.equal(created);
    });

    it('should reject when uploading to someone else’s folder', async () => {
      sinon.stub(Folder, 'findById').resolves({ _id: f1, user: 'zzz' });
      await assert.rejects(() => svc.uploadToFolder(u1, f1, {}), /Not authorized/);
    });
  });

  describe('rename()', () => {
    it('should update name and return selected fields', async () => {
      const fileDoc = {
        _id: 'file1', user: u1, name: 'old', size: 10, mimetype: 't',
        createdAt: new Date(), save: sinon.stub()
      };
      fileDoc.save.resolves({ ...fileDoc, name: 'new.pdf' });
      sinon.stub(File, 'findById').resolves(fileDoc);

      const res = await svc.rename(u1, 'file1', { name: 'new.pdf' });
      expect(res).to.have.keys(['id', 'name', 'size', 'mimetype', 'createdAt']);
      expect(res.name).to.equal('new.pdf');
    });

    it('should reject when new name is empty', async () => {
      await assert.rejects(() => svc.rename(u1, 'file1', { name: '  ' }),
                           { message: 'New file name is required' });
    });

    it('should reject when file belongs to another user', async () => {
      sinon.stub(File, 'findById').resolves({ _id: 'file1', user: 'other' });
      await assert.rejects(() => svc.rename(u1, 'file1', { name: 'a' }), /Not authorized/);
    });
  });

  describe('remove()', () => {
    it('should trash file when the file is set deletedAt', async () => {
      sinon.stub(File, 'findById').resolves({ _id: 'file1', user: u1 });
      const upd = sinon.stub(File, 'updateOne').resolves({ acknowledged: true });
      const r = await svc.remove(u1, 'file1');
      expect(upd.calledOnce).to.be.true;
      expect(r).to.deep.equal({ message: 'File trashed successfully' });
    });

    it('should reject when file belongs to another user', async () => {
      sinon.stub(File, 'findById').resolves({ _id: 'file1', user: 'other' });
      await assert.rejects(() => svc.remove(u1, 'file1'), /Not authorized/);
    });
  });

  describe('accessPublic()', () => {
    it('should reject with 410 when link is expired', async () => {
      const expired = new Date(Date.now() - 1000);
      sinon.stub(File, 'findOne').resolves({
        _id: 'f', publicId: 'pid', filePath: '/data/x', expiresAt: expired
      });
      await assert.rejects(() => svc.accessPublic('pid'), { message: 'This link has expired.' });
    });
  });

  describe('touchAccess()', () => {
    it('should update lastAccessedAt for a valid file id', async () => {
      const service = new FileService({ storage: {} });
      const file = { _id: 'file123' };
      const updateStub = sinon.stub(File, 'updateOne')
        .resolves({ acknowledged: true, modifiedCount: 1 });

      const before = Date.now();
      await service.touchAccess(file);
      expect(updateStub.calledOnce).to.be.true;

      const [filter, update] = updateStub.firstCall.args;
      expect(filter).to.deep.equal({ _id: file._id });
      expect(update.$set.lastAccessedAt).to.be.instanceOf(Date);

      const ts = update.$set.lastAccessedAt.getTime();
      expect(ts).to.be.at.least(before);
      expect(ts).to.be.at.most(Date.now());
    });

    it('should do nothing when file or _id is missing', async () => {
      const service = new FileService({ storage: {} });
      const updateStub = sinon.stub(File, 'updateOne').resolves();

      await service.touchAccess(undefined);
      await service.touchAccess({});
      expect(updateStub.notCalled).to.be.true;
    });
  });

  describe('getFileDetails()', () => {
    it('should return required fields', async () => {
      const doc = {
        _id: 'id1', user: u1, name: 'n', size: 1, mimetype: 't',
        createdAt: new Date(), updatedAt: new Date(), folder: f1,
        publicId: null, expiresAt: null, deletedAt: null
      };
      sinon.stub(File, 'findById').resolves(doc);
      const r = await svc.getFileDetails(u1, 'id1');
      expect(r).to.include.keys([
        'id','name','size','mimetype','createdAt','updatedAt','folder','publicId','expiresAt','deletedAt'
      ]);
    });
  });
});