// test/zipController.test.js
const { expect } = require('chai');
const { EventEmitter } = require('events');
const path = require('path');

describe('ZipController', () => {
    const projectRoot = path.resolve(__dirname, '..'); // adjust if tests live elsewhere
    const zipControllerPath = path.resolve(projectRoot, 'controllers/ZipController.js'); 

    // These are the module IDs ZipController requires:
    //   './BaseController' (relative to ZipController)
    //   'content-disposition' (package)
    const inferredBaseControllerPath = path.resolve(path.dirname(zipControllerPath), './BaseController');
    const fakeContentDispositionId = path.resolve(projectRoot, 'node_modules/content-disposition/index.js');

    // Helper: wipe module caches and load SUT with mocks injected
    const loadWithMocks = (mocks) => {
        // Clean caches
        delete require.cache[zipControllerPath];
        delete require.cache[inferredBaseControllerPath];
        delete require.cache[fakeContentDispositionId];

        // Install mocks into require cache
        require.cache[inferredBaseControllerPath] = { exports: mocks.BaseControllerClass };
        require.cache[fakeContentDispositionId] = { exports: mocks.contentDisposition };

        // Load SUT
        return require(zipControllerPath);
    };

    // Tiny spy utility (no sinon)
    const makeSpy = () => {
        const calls = [];
        const fn = (...args) => { calls.push(args); };
        fn.calls = calls;
        return fn;
    };

    // Fake stream for the happy/error paths
    class FakeReadableStream extends EventEmitter {
        constructor() {
        super();
        this.pipeCalls = [];
        }
        pipe(dest) {
        this.pipeCalls.push(dest);
        // no real piping; tests only assert that pipe was invoked
        return dest;
        }
    }

    // Fake Express-like response
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
        res.headersSent = true; // Express marks as sent after sending the body
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
        query: {}, // can override with files query
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

    it('zipFolder: sets headers and pipes stream to response (happy path)', async () => {
        // Arrange: spies and mocks
        const contentDispositionSpy = makeSpy();
        const contentDisposition = (filename) => {
        contentDispositionSpy(filename);
        return `attachment; filename="${filename}"`;
        };

        // Mock BaseController to capture handleError if called
        const handleErrorSpy = makeSpy();
        class FakeBaseController {
        handleError(res, err) { handleErrorSpy(res, err); }
        }

        // zipServiceProxy mock
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

        const req = sampleReq(); // no files query
        const res = makeFakeRes();

        // Act
        await controller.zipFolder(req, res);

        // Assert: service called with derived args
        expect(zipFolderSpy.calls).to.have.length(1);
        expect(zipFolderSpy.calls[0][0]).to.deep.equal({
        userId: 'user-123',
        folderId: 'folder-456',
        fileIds: [], // from empty query
        });

        // Assert: headers set
        expect(res.headers['Content-Type']).to.equal('application/zip');
        expect(contentDispositionSpy.calls).to.have.length(1);
        expect(contentDispositionSpy.calls[0][0]).to.equal('download.zip');
        expect(res.headers['Content-Disposition']).to.equal('attachment; filename="download.zip"');

        // Assert: stream piped to res
        expect(zipResult.stream.pipeCalls).to.have.length(1);
        expect(zipResult.stream.pipeCalls[0]).to.equal(res);

        // No errors
        expect(handleErrorSpy.calls).to.have.length(0);
    });

    it('zipFolder: parses files query into fileIds', async () => {
        const contentDisposition = () => 'attachment; filename="x.zip"';
        class FakeBaseController { handleError() {} }

        const seenArgs = [];
        const zipServiceProxy = {
        zipFolder: async (args) => {
            seenArgs.push(args);
            return sampleZipResult();
        },
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

    it('zipFolder: stream error before headers sent -> returns 500 json', async () => {
        const contentDisposition = () => 'attachment; filename="a.zip"';

        const handleErrorSpy = makeSpy();
        class FakeBaseController {
        handleError(res, err) { handleErrorSpy(res, err); }
        }

        const zipResult = sampleZipResult();
        const zipServiceProxy = {
        zipFolder: async () => zipResult,
        };

        const { ZipController } = loadWithMocks({
        BaseControllerClass: FakeBaseController,
        contentDisposition,
        });

        const controller = new ZipController({ zipServiceProxy });
        const req = sampleReq();
        const res = makeFakeRes();

        // Act: call, then emit error *before* any body has been sent
        const p = controller.zipFolder(req, res);
        // emit the stream error
        const err = new Error('boom');
        zipResult.stream.emit('error', err);
        await p; // zipFolder awaited

        // Assert: 500 JSON and no destroy (since headers not sent)
        expect(res.statusCode).to.equal(500);
        expect(res.jsonPayloads).to.have.length(1);
        expect(res.jsonPayloads[0]).to.deep.equal({ error: true, message: 'ZIP stream failed' });
        expect(res.destroyedWith).to.equal(null);

        // No controller-level handleError here (handled in stream handler)
        expect(handleErrorSpy.calls).to.have.length(0);
    });

    it('zipFolder: stream error after headers sent -> res.destroy(err)', async () => {
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

        // Simulate that headers/body were already sent (like after piping starts)
        res.headersSent = true;

        await controller.zipFolder(req, res);

        // Emit error AFTER headers are sent
        const err = new Error('late error');
        zipResult.stream.emit('error', err);

        // Assert: res.destroy called with error
        expect(res.destroyedWith).to.equal(err);
    });

    it('zipFolder: when service throws -> delegates to handleError', async () => {
        const contentDisposition = () => 'attachment; filename="c.zip"';

        const handleErrorSpy = makeSpy();
        class FakeBaseController {
        handleError(res, err) { handleErrorSpy(res, err); }
        }

        const thrown = new Error('service failed');
        const zipServiceProxy = {
        zipFolder: async () => { throw thrown; },
        };

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
