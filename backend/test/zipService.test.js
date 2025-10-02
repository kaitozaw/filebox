const { expect } = require('chai');
const { EventEmitter } = require('events');
const { PassThrough } = require('stream');
const path = require('path');
const Module = require('module');

describe('ZipService', () => {
    const projectRoot = path.resolve(__dirname, '..');
    const zipServicePath = path.resolve(projectRoot, 'services/zip/ZipService.js');

    const resolveFromSUT = (request) => {
        const basedir = path.dirname(zipServicePath);
        return Module._resolveFilename(request, {
        id: zipServicePath,
        filename: zipServicePath,
        paths: Module._nodeModulePaths(basedir),
        });
    };
    const resolvedArchiverId = resolveFromSUT('archiver');

    const loadWithArchiverMock = (archiverMockFactory) => {
        [zipServicePath, resolvedArchiverId].forEach((id) => delete require.cache[id]);
        require.cache[resolvedArchiverId] = { exports: archiverMockFactory };
        return require(zipServicePath);
    };

    const makeSpy = () => {
        const calls = [];
        const fn = async (...args) => { calls.push(args); };
        fn.calls = calls;
        return fn;
    };

    const makeFakeArchiverFactory = () => {
        const state = { lastArgs: null, lastInstance: null };

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

        factory.__getState = () => state;
        return factory;
    };

    const folder = { _id: 'fold-1', user: 'user-1', name: 'MyFolder' };
    const files = [
        { id: 'f1', name: 'a.txt' },
        { id: 'f2', name: 'b.jpg' },
    ];

    it('should create a zip, append files, pipe to PassThrough, finalize, and return expected response', async () => {
        const archiverFactory = makeFakeArchiverFactory();

        const streamsByFile = new Map();
        const getFileStream = async (file) => {
        const s = new PassThrough();
        streamsByFile.set(file.name, s);
        return s;
        };

        const ZipService = loadWithArchiverMock(archiverFactory);
        const zipService = new ZipService({ fileService: { getFileStream } });

        let eventPayload = null;
        zipService.once('ZIP_CREATED', (p) => { eventPayload = p; });

        const result = await zipService.zipFolder({ folder, files });

        const archState = archiverFactory.__getState();
        expect(archState.lastArgs).to.deep.equal({
        format: 'zip',
        options: { zlib: { level: 9 } },
        });

        const archive = archState.lastInstance;
        expect(archive.pipeDest).to.equal(result.stream);
        expect(result.stream).to.be.instanceOf(PassThrough);

        expect(archive.appendCalls).to.have.length(files.length);
        for (let i = 0; i < files.length; i++) {
        const [streamArg, optsArg] = archive.appendCalls[i];
        expect(optsArg).to.deep.equal({ name: files[i].name });
        expect(streamArg).to.equal(streamsByFile.get(files[i].name));
        }

        expect(archive.finalizeCalls).to.equal(1);

        expect(result.filename).to.equal('MyFolder.zip');
        expect(result.headers).to.deep.equal({ 'Content-Type': 'application/zip' });

        expect(eventPayload).to.be.an('object');
        expect(eventPayload.folderId).to.equal(folder._id);
        expect(eventPayload.userId).to.equal(folder.user);
        expect(eventPayload.fileCount).to.equal(files.length);
        expect(eventPayload.timestamp).to.be.instanceOf(Date);
    });

    it('should forward archiver errors to the returned stream', async () => {
        const archiverFactory = makeFakeArchiverFactory();
        const ZipService = loadWithArchiverMock(archiverFactory);

        const zipService = new ZipService({
        fileService: { getFileStream: async () => new PassThrough() },
        });

        const { stream } = await zipService.zipFolder({ folder, files });

        let receivedError = null;
        stream.once('error', (e) => { receivedError = e; });

        const { lastInstance } = archiverFactory.__getState();
        const boom = new Error('archiver exploded');
        lastInstance.emit('error', boom);

        await new Promise((r) => setImmediate(r));
        expect(receivedError).to.equal(boom);
    });

    it('should call fileService.getFileStream for each file object passed in', async () => {
        const archiverFactory = makeFakeArchiverFactory();

        const getFileStream = makeSpy();
        getFileStream.impl = async () => new PassThrough();
        const getFileStreamWrapper = async (...args) => {
        await getFileStream(...args);
        return getFileStream.impl(...args);
        };

        const ZipService = loadWithArchiverMock(archiverFactory);
        const zipService = new ZipService({ fileService: { getFileStream: getFileStreamWrapper } });

        await zipService.zipFolder({ folder, files });

        expect(getFileStream.calls).to.have.length(files.length);
        expect(getFileStream.calls[0][0]).to.equal(files[0]);
        expect(getFileStream.calls[1][0]).to.equal(files[1]);
    });
});
