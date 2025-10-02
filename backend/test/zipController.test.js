const { expect } = require('chai');
const { EventEmitter } = require('events');
const path = require('path');
const Module = require('module');

describe('ZipController tests', () => {
    const projectRoot = path.resolve(__dirname, '..');
    const zipControllerPath = path.resolve(projectRoot, 'controllers/ZipController.js');

    const resolveFromSUT = (request) => {
        const basedir = path.dirname(zipControllerPath);
        return Module._resolveFilename(request, {
        id: zipControllerPath,
        filename: zipControllerPath,
        paths: Module._nodeModulePaths(basedir),
        });
    };

    const resolvedBaseControllerId   = resolveFromSUT('./BaseController');
    const resolvedContentDispId      = resolveFromSUT('content-disposition');

    const loadWithMocks = (mocks) => {
        [zipControllerPath, resolvedBaseControllerId, resolvedContentDispId].forEach((id) => delete require.cache[id]);
        require.cache[resolvedBaseControllerId] = { exports: mocks.BaseControllerClass };
        require.cache[resolvedContentDispId]    = { exports: mocks.contentDisposition };
        return require(zipControllerPath);
    };

    const makeSpy = () => {
        const calls = [];
        const fn = (...args) => { calls.push(args); };
        fn.calls = calls;
        return fn;
    };

    class FakeReadableStream extends EventEmitter {
        constructor() {
        super();
        this.pipeCalls = [];
        }
        pipe(dest) {
        this.pipeCalls.push(dest);
        return dest;
        }
    }

    const makeFakeRes = () => {
        const res = new EventEmitter();
        res.headers = {};
        res.headersSent = false;

        res.setHeader = (k, v) => { res.headers[k] = v; };
        res.statusCode = 200;

        res.status = (code) => {
        res.statusCode = code;
        return res;
        };

        res.jsonPayloads = [];
        res.json = (obj) => {
        res.jsonPayloads.push(obj);
        res.headersSent = true;
        return res;
        };

        res.destroyedWith = null;
        res.destroy = (err) => {
        res.destroyedWith = err;
        };

        return res;
    };

    const sampleReq = (overrides = {}) => ({
        user: { id: 'user-123' },
        params: { id: 'folder-456' },
        query: {},
        ...overrides,
    });

    const sampleZipResult = (overrides = {}) => {
        const stream = new FakeReadableStream();
        return {
        stream,
        filename: 'download.zip',
        headers: { 'Content-Type': 'application/zip' },
        ...overrides,
        };
    };

    it('zipFolder: should set headers and pipe stream to response', async () => {
        const contentDispositionSpy = makeSpy();
        const contentDisposition = (filename) => {
        contentDispositionSpy(filename);
        return `attachment; filename="${filename}"`;
        };

        const handleErrorSpy = makeSpy();
        class FakeBaseController { handleError(res, err) { handleErrorSpy(res, err); } }

        const zipFolderSpy = makeSpy();
        const zipResult = sampleZipResult();
        const zipServiceProxy = {
        zipFolder: async (args) => { zipFolderSpy(args); return zipResult; },
        };

        const { ZipController } = loadWithMocks({
        BaseControllerClass: FakeBaseController,
        contentDisposition,
        });

        const controller = new ZipController({ zipServiceProxy });

        const req = sampleReq();
        const res = makeFakeRes();

        await controller.zipFolder(req, res);

        expect(zipFolderSpy.calls).to.have.length(1);
        expect(zipFolderSpy.calls[0][0]).to.deep.equal({
        userId: 'user-123',
        folderId: 'folder-456',
        fileIds: [],
        });

        expect(res.headers['Content-Type']).to.equal('application/zip');
        expect(contentDispositionSpy.calls).to.have.length(1);
        expect(contentDispositionSpy.calls[0][0]).to.equal('download.zip');
        expect(res.headers['Content-Disposition']).to.equal('attachment; filename="download.zip"');

        expect(zipResult.stream.pipeCalls).to.have.length(1);
        expect(zipResult.stream.pipeCalls[0]).to.equal(res);

        expect(handleErrorSpy.calls).to.have.length(0);
    });

    it('zipFolder: should parse files query into fileIds', async () => {
        const contentDisposition = () => 'attachment; filename="x.zip"';
        class FakeBaseController { handleError() {} }

        const seenArgs = [];
        const zipServiceProxy = {
        zipFolder: async (args) => { seenArgs.push(args); return sampleZipResult(); },
        };

        const { ZipController } = loadWithMocks({
        BaseControllerClass: FakeBaseController,
        contentDisposition,
        });

        const controller = new ZipController({ zipServiceProxy });
        const req = sampleReq({ query: { files: 'a,b,c' } });
        const res = makeFakeRes();

        await controller.zipFolder(req, res);

        expect(seenArgs).to.have.length(1);
        expect(seenArgs[0].fileIds).to.deep.equal(['a', 'b', 'c']);
    });

    it('zipFolder: should stream error before headers sent -> returns 500 json', async () => {
        const contentDisposition = () => 'attachment; filename="a.zip"';

        const handleErrorSpy = makeSpy();
        class FakeBaseController { handleError(res, err) { handleErrorSpy(res, err); } }

        const zipResult = sampleZipResult();
        const zipServiceProxy = { zipFolder: async () => zipResult };

        const { ZipController } = loadWithMocks({
        BaseControllerClass: FakeBaseController,
        contentDisposition,
        });

        const controller = new ZipController({ zipServiceProxy });
        const req = sampleReq();
        const res = makeFakeRes();

        await controller.zipFolder(req, res);

        const err = new Error('boom');
        zipResult.stream.emit('error', err);

        expect(res.statusCode).to.equal(500);
        expect(res.jsonPayloads).to.have.length(1);
        expect(res.jsonPayloads[0]).to.deep.equal({ error: true, message: 'ZIP stream failed' });
        expect(res.destroyedWith).to.equal(null);
        expect(handleErrorSpy.calls).to.have.length(0);
    });

    it('zipFolder: should stream error after headers sent -> res.destroy(err)', async () => {
        const contentDisposition = () => 'attachment; filename="b.zip"';
        class FakeBaseController { handleError() {} }

        const zipResult = sampleZipResult();
        const zipServiceProxy = { zipFolder: async () => zipResult };

        const { ZipController } = loadWithMocks({
        BaseControllerClass: FakeBaseController,
        contentDisposition,
        });

        const controller = new ZipController({ zipServiceProxy });
        const req = sampleReq();
        const res = makeFakeRes();

        res.headersSent = true;

        await controller.zipFolder(req, res);

        const err = new Error('late error');
        zipResult.stream.emit('error', err);

        expect(res.destroyedWith).to.equal(err);
    });

    it('zipFolder: when service throws -> delegates to handleError', async () => {
        const contentDisposition = () => 'attachment; filename="c.zip"';

        const handleErrorSpy = makeSpy();
        class FakeBaseController { handleError(res, err) { handleErrorSpy(res, err); } }

        const thrown = new Error('service failed');
        const zipServiceProxy = { zipFolder: async () => { throw thrown; } };

        const { ZipController } = loadWithMocks({
        BaseControllerClass: FakeBaseController,
        contentDisposition,
        });

        const controller = new ZipController({ zipServiceProxy });
        const req = sampleReq();
        const res = makeFakeRes();

        await controller.zipFolder(req, res);

        expect(handleErrorSpy.calls).to.have.length(1);
        expect(handleErrorSpy.calls[0][0]).to.equal(res);
        expect(handleErrorSpy.calls[0][1]).to.equal(thrown);
    });
});
