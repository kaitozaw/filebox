const { expect } = require('chai');
const sinon = require('sinon');
const { FileController } = require('../controllers/FileController');

function mockRes() {
  const res = {
    headers: {},
    code: 200,
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.code = c; return this; },
    json(obj) { this.body = obj; return this; },
    end() { return this; },
    write() { return true; }
  };
  return res;
}

describe('FileController tests', () => {
  let controller, fileService;

  beforeEach(() => {
    fileService = {
      listInFolder: sinon.stub(),
      download: sinon.stub(),
      uploadToFolder: sinon.stub(),
      generatePublicUrl: sinon.stub(),
      rename: sinon.stub(),
      remove: sinon.stub(),
      accessPublic: sinon.stub(),
      preview: sinon.stub(),
      getFileDetails: sinon.stub()
    };
    controller = new FileController({ fileService });
  });

  afterEach(() => sinon.restore());

  it('should return file in the folder', async () => {
    const req = { user: { id: 'u1' }, params: { folderId: 'f1' } };
    const res = mockRes();
    fileService.listInFolder.resolves([{ name: 'a' }]);

    await controller.listFilesInFolder(req, res);
    expect(res.code).to.equal(200);
    expect(res.body).to.have.property('files').that.is.an('array');
  });

  it('should throw error when folder is not found', async () => {
    const req = { user: { id: 'u1' }, params: { folderId: 'missing' } };
    const res = mockRes();
    const err = new Error('Folder not found');
    err.name = 'NotFoundError';
    fileService.listInFolder.rejects(err);

    await controller.listFilesInFolder(req, res);
    expect(res.code).to.equal(404);
    expect(res.body).to.deep.include({ message: 'Folder not found' });
  });

  it('should set headers and pipe stream when download file', async () => {
    const req = { user: { id: 'u1' }, params: { fileId: 'x' } };
    const res = mockRes();

    const fakeStream = { pipe: sinon.stub().returns(res), on: sinon.stub() };
    fileService.download.resolves({
      stream: fakeStream,
      headers: { 'Content-Type': 'text/plain', 'Content-Length': 2 }
    });

    await controller.downloadFile(req, res);
    expect(res.headers['Content-Type']).to.equal('text/plain');
    expect(fakeStream.pipe.calledWith(res)).to.equal(true);
  });

  it('should Forbidden error when download is not authorized', async () => {
    const req = { user: { id: 'u1' }, params: { fileId: 'x' } };
    const res = mockRes();
    const err = new Error('Not authorized to download this file');
    err.name = 'ForbiddenError';
    fileService.download.rejects(err);

    await controller.downloadFile(req, res);
    expect(res.code).to.equal(403);
    expect(res.body.message).to.match(/Not authorized/);
  });

  it('should throw error when new file name is not set', async () => {
    const req = { user: { id: 'u1' }, params: { fileId: 'x' }, body: { name: '' } };
    const res = mockRes();
    fileService.rename.rejects(new Error('New file name is required'));

    await controller.renameFile(req, res);
    expect(res.body).to.have.property('message');
  });

  it('should returns 201 Created with payload', async () => {
    const req = { user: { id: 'u1' }, params: { folderId: 'f1' }, file: { originalname: 'x' } };
    const res = mockRes();
    fileService.uploadToFolder.resolves({ _id: 'file1', name: 'x' });

    await controller.uploadFile(req, res);
    expect(res.code).to.equal(201);
    expect(res.body).to.deep.equal({ _id: 'file1', name: 'x' });
  });

  it('should pass BASE_URL when generating public URL successfully', async () => {
    const prevBase = process.env.BASE_URL;
    process.env.BASE_URL = 'http://localhost:3000';

    const req = { user: { id: 'u1' }, params: { fileId: 'f' } };
    const res = mockRes();
    fileService.generatePublicUrl.resolves({ publicUrl: 'http://localhost:3000/api/public/uuid' });

    await controller.generatePublicUrl(req, res);

    expect(res.code).to.equal(200);
    expect(res.body).to.have.property('publicUrl');
    sinon.assert.calledWith(
      fileService.generatePublicUrl,
      'u1',
      'f',
      'http://localhost:3000'
    );

    process.env.BASE_URL = prevBase;
  });

  it('should throw error when it fails generate public url', async () => {
    const req = { user: { id: 'u1' }, params: { fileId: 'x' } };
    const res = mockRes();
    const err = new Error('I am a teapot');
    err.code = 418;
    err.name = 'ForbiddenError';
    fileService.generatePublicUrl.rejects(err);

    await controller.generatePublicUrl(req, res);
    expect(res.code).to.equal(418);
    expect(res.body.message).to.equal('I am a teapot');
  });

  it('should return 200 with a success message when trashing a file', async () => {
    const req = { user: { id: 'u1' }, params: { fileId: 'x' } };
    const res = mockRes();
    fileService.remove.resolves({ message: 'File trashed successfully' });

    await controller.deleteFile(req, res);
    expect(res.code).to.equal(200);
    expect(res.body).to.deep.equal({ message: 'File trashed successfully' });
  });

  it('should throw error when public link is expired', async () => {
    const req = { params: { publicId: 'pid' } };
    const res = mockRes();
    const err = new Error('This link has expired.');
    err.status = 410;
    fileService.accessPublic.rejects(err);

    await controller.accessPublicFile(req, res);
    expect(res.code).to.equal(410);
    expect(res.body).to.deep.equal({ message: 'This link has expired.' });
  });

  it('should set headers and pipe on success when access public file', async () => {
    const req = { params: { publicId: 'pid' } };
    const res = mockRes();
    const fakeStream = { pipe: sinon.stub().returns(res), on: sinon.stub() };
    fileService.accessPublic.resolves({
      stream: fakeStream,
      headers: { 'Content-Type': 'application/pdf' }
    });

    await controller.accessPublicFile(req, res);
    expect(res.headers['Content-Type']).to.equal('application/pdf');
    expect(fakeStream.pipe.calledWith(res)).to.equal(true);
  });

  it('should pass query, set headers and pipes when get preview successfully', async () => {
    const req = { user: { id: 'u1' }, params: { fileId: 'f1' }, query: { page: 2, size: 'thumb' } };
    const res = mockRes();
    const fakeStream = { pipe: sinon.stub().returns(res), on: sinon.stub() };
    fileService.preview.resolves({
      stream: fakeStream,
      headers: { 'Content-Type': 'image/png' }
    });

    await controller.getPreview(req, res);

    expect(res.headers['Content-Type']).to.equal('image/png');
    expect(fakeStream.pipe.calledWith(res)).to.equal(true);
    sinon.assert.calledWith(fileService.preview, 'u1', 'f1', { page: 2, size: 'thumb' });
  });

  it('should throw error when get preview is failed', async () => {
    const req = { user: { id: 'u1' }, params: { fileId: 'x' }, query: {} };
    const res = mockRes();
    fileService.preview.rejects(new Error('render failed'));

    await controller.getPreview(req, res);
    expect(res.code).to.equal(500);
    expect(res.body.message).to.equal('render failed');
  });

  it('should return 200 with details when get file details successfully: ', async () => {
    const req = { user: { id: 'u1' }, params: { fileId: 'id1' } };
    const res = mockRes();
    fileService.getFileDetails.resolves({
      id: 'id1', name: 'n', size: 1, mimetype: 't',
      createdAt: new Date(), updatedAt: new Date(), folder: 'f1',
      publicId: null, expiresAt: null, deletedAt: null
    });

    await controller.getFileDetails(req, res);
    expect(res.code).to.equal(200);
    expect(res.body).to.include.keys([
      'id','name','size','mimetype','createdAt','updatedAt','folder','publicId','expiresAt','deletedAt'
    ]);
  });
});
