// test/zipService.test.js
const { expect } = require('chai');
const { EventEmitter } = require('events');
const { PassThrough } = require('stream');
const path = require('path');

describe('ZipService', () => {
    const projectRoot = path.resolve(__dirname, '..'); // adjust if your tests live elsewhere
    const zipServicePath = path.resolve(projectRoot, 'services/zip/ZipService.js'); // <-- UPDATE THIS

    // ZipService requires 'archiver' (a package). We'll inject a fake as:
    //   <projectRoot>/node_modules/archiver/index.js
    const fakeArchiverId = path.resolve(projectRoot, 'node_modules/archiver/index.js');

    // Helper: fresh-load SUT with injected archiver mock
    const loadWithMocks = (archiverMockFactory) => {
        delete require.cache[zipServicePath];
        delete require.cache[fakeArchiverId];

        // Install the mock archiver factory into require cache
        require.cache[fakeArchiverId] = { exports: archiverMockFactory };

        return require(zipServicePath);
    };

    // Tiny spy util (no sinon)
    const makeSpy = () => {
        const calls = [];
        const fn = async (...args) => { calls.push(args); }; // async to match getFileStream usage
        fn.calls = calls;
        return fn;
    };

    // Build a fake "archiver" export that records calls and exposes the last instance
    const makeFakeArchiverFactory = () => {
        const state = {
        lastArgs: null,
        lastInstance: null,
        };

        const factory = (format, options) => {
        state.lastArgs = { format, options };

        const inst = new EventEmitter();
        inst.pipeDest = null;
        inst.appendCalls = [];
        inst.finalizeCalls = 0;

        inst.pipe = (dest) => { inst.pipeDest = dest; return dest; };
        inst.append = (stream, opts) => { inst.appendCalls.push([stream, opts]); };
        inst.finalize = () => { inst.finalizeCalls += 1; };

        state.lastInstance = inst;
        return inst;
        };

        // Expose a getter for tests
        factory.__getState = () => state;
        return factory;
    };

    // Sample inputs
    const folder = { _id: 'fold-1', user: 'user-1', name: 'MyFolder' };
    const files = [
        { id: 'f1', name: 'a.txt' },
        { id: 'f2', name: 'b.jpg' },
    ];

    it('creates a zip, appends files, pipes to PassThrough, finalizes, and returns expected response', async () => {
        // Arrange: archiver mock and fileService stub
        const archiverFactory = makeFakeArchiverFactory();

        const streamsByFile = new Map();
        const getFileStream = async (file) => {
        const s = new PassThrough();
        streamsByFile.set(file.name, s);
        return s;
        };

        const ZipService = loadWithMocks(archiverFactory);
        const zipService = new ZipService({ fileService: { getFileStream } });

        // Act
        const result = await zipService.zipFolder({ folder, files });

        // Assert: archiver created with correct args
        const archState = archiverFactory.__getState();
        expect(archState.lastArgs).to.deep.equal({
        format: 'zip',
        options: { zlib: { level: 9 } },
        });

        // Assert: `pipe` destination is the returned stream (PassThrough)
        const archive = archState.lastInstance;
        expect(archive.pipeDest).to.equal(result.stream);
        expect(result.stream).to.be.instanceOf(PassThrough);

        // Assert: append called for each file with correct name, using the same streams returned by fileService
        expect(archive.appendCalls).to.have.length(files.length);
        for (let i = 0; i < files.length; i++) {
        const [streamArg, optsArg] = archive.appendCalls[i];
        expect(optsArg).to.deep.equal({ name: files[i].name });
        expect(streamArg).to.equal(streamsByFile.get(files[i].name));
        }

        // Assert: finalize called exactly once
        expect(archive.finalizeCalls).to.equal(1);

        // Assert: return shape (headers + filename)
        expect(result.filename).to.equal('MyFolder.zip');
        expect(result.headers).to.deep.equal({ 'Content-Type': 'application/zip' });

        // Assert: emits ZIP_CREATED with correct payload
        let eventPayload = null;
        zipService.once('ZIP_CREATED', (p) => { eventPayload = p; });

        // Manually emit because our fake archiver doesn't do any async progression;
        // but ZipService emits this synchronously after finalize(), so eventPayload should already be set.
        // Give event loop a tick just in case:
        await new Promise((r) => setImmediate(r));

        expect(eventPayload).to.be.an('object');
        expect(eventPayload.folderId).to.equal(folder._id);
        expect(eventPayload.userId).to.equal(folder.user);
        expect(eventPayload.fileCount).to.equal(files.length);
        expect(eventPayload.timestamp).to.be.instanceOf(Date);
    });

    it('forwards archiver errors to the returned stream', async () => {
        const archiverFactory = makeFakeArchiverFactory();
        const ZipService = loadWithMocks(archiverFactory);

        const zipService = new ZipService({
        fileService: { getFileStream: async () => new PassThrough() },
        });

        const { stream } = await zipService.zipFolder({ folder, files });

        // Listen for errors on the returned stream
        let receivedError = null;
        stream.once('error', (e) => { receivedError = e; });

        // Trigger an error from the archiver instance (after the method returns)
        const { lastInstance } = archiverFactory.__getState();
        const boom = new Error('archiver exploded');
        lastInstance.emit('error', boom);

        // Wait a tick for event propagation
        await new Promise((r) => setImmediate(r));

        expect(receivedError).to.equal(boom);
    });

    it('calls fileService.getFileStream for each file object passed in', async () => {
        const archiverFactory = makeFakeArchiverFactory();

        // Spy-like getFileStream to record calls
        const getFileStream = makeSpy();
        // Return a fresh PassThrough for each call
        getFileStream.impl = async () => new PassThrough();
        const getFileStreamWrapper = async (...args) => {
        await getFileStream(...args);
        return getFileStream.impl(...args);
        };

        const ZipService = loadWithMocks(archiverFactory);
        const zipService = new ZipService({ fileService: { getFileStream: getFileStreamWrapper } });

        await zipService.zipFolder({ folder, files });

        expect(getFileStream.calls).to.have.length(files.length);
        // Ensure the exact file objects were passed
        expect(getFileStream.calls[0][0]).to.equal(files[0]);
        expect(getFileStream.calls[1][0]).to.equal(files[1]);
    });
});
