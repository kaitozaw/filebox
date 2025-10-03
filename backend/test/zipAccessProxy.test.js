const { expect } = require('chai');
const path = require('path');
const Module = require('module');


const projectRoot = path.resolve(__dirname, '..');
const zipServiceProxyPath = path.resolve(projectRoot, 'services/zip/ZipServiceProxy.js');

const resolveFromSUT = (request) => {
    const basedir = path.dirname(zipServiceProxyPath);
    return Module._resolveFilename(request, {
        id: zipServiceProxyPath,
        filename: zipServiceProxyPath,
        paths: Module._nodeModulePaths(basedir),
    });
    };

    const resolvedErrorsId = resolveFromSUT('../../utils/errors');

    const loadWithMocks = (errorsExport) => {
    [zipServiceProxyPath, resolvedErrorsId].forEach((id) => delete require.cache[id]);
    require.cache[resolvedErrorsId] = { exports: errorsExport };
    return require(zipServiceProxyPath);
    };

    const makeSpy = () => {
    const calls = [];
    const fn = (...args) => { calls.push(args); };
    fn.calls = calls;
    return fn;
    };

    class ValidationError extends Error {}
    class ForbiddenError extends Error {}
    class NotFoundError extends Error {}
    class TooManyRequestsError extends Error {}
    const Errors = { ValidationError, ForbiddenError, NotFoundError, TooManyRequestsError };

    const userId = 'user-1';
    const folderId = 'folder-1';
    const baseFolder = { _id: folderId, user: userId, name: 'My Folder' };

    const makeSvcStubs = (overrides = {}) => {
    const folderService = {
        getFolderById: async () => baseFolder,
        ...(overrides.folderService || {}),
    };
    const fileService = {
        listInFolder: async () => [],
        ...(overrides.fileService || {}),
    };
    const zipService = {
        zipFolder: async ({ folder, files }) => ({
        stream: { mocked: true },
        filename: `${folder.name}.zip`,
        headers: { 'Content-Type': 'application/zip' },
        filesCount: files.length,
        }),
        ...(overrides.zipService || {}),
    };
    const quotaService = {
        checkQuota: async () => ({ overQuota: false }),
        ...(overrides.quotaService || {}),
    };
    return { folderService, fileService, zipService, quotaService };
    };

    describe('ZipServiceProxy tests', () => {
    it('should throw NotFoundError when folder does not exist', async () => {
        const ZipServiceProxy = loadWithMocks(Errors);
        const services = makeSvcStubs({
        folderService: { getFolderById: async () => null },
        });
        const proxy = new ZipServiceProxy(services);

        try {
        await proxy.zipFolder({ userId, folderId, fileIds: ['a'] });
        throw new Error('Expected NotFoundError to be thrown');
        } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
        expect(err.message).to.match(/Folder not found/i);
        }
    });

    it('should throw ForbiddenError when folder user does not match', async () => {
        const ZipServiceProxy = loadWithMocks(Errors);
        const services = makeSvcStubs({
        folderService: { getFolderById: async () => ({ ...baseFolder, user: 'another-user' }) },
        });
        const proxy = new ZipServiceProxy(services);

        try {
        await proxy.zipFolder({ userId, folderId, fileIds: ['a'] });
        throw new Error('Expected ForbiddenError to be thrown');
        } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.match(/not authorized/i);
        }
    });

    it('should throw TooManyRequestsError when over quota', async () => {
        const ZipServiceProxy = loadWithMocks(Errors);
        const services = makeSvcStubs({
        quotaService: { checkQuota: async () => ({ overQuota: true }) },
        });
        const proxy = new ZipServiceProxy(services);

        try {
        await proxy.zipFolder({ userId, folderId, fileIds: ['a'] });
        throw new Error('Expected TooManyRequestsError to be thrown');
        } catch (err) {
        expect(err).to.be.instanceOf(TooManyRequestsError);
        expect(err.message).to.match(/quota/i);
        }
    });

    it('should throw ValidationError when no fileIds are provided', async () => {
        const ZipServiceProxy = loadWithMocks(Errors);
        const services = makeSvcStubs();
        const proxy = new ZipServiceProxy(services);

        await Promise.all([
        (async () => {
            try {
            await proxy.zipFolder({ userId, folderId, fileIds: undefined });
            throw new Error('Expected ValidationError');
            } catch (err) {
            expect(err).to.be.instanceOf(ValidationError);
            expect(err.message).to.match(/No file is selected/i);
            }
        })(),
        (async () => {
            try {
            await proxy.zipFolder({ userId, folderId, fileIds: [] });
            throw new Error('Expected ValidationError');
            } catch (err) {
            expect(err).to.be.instanceOf(ValidationError);
            expect(err.message).to.match(/No file is selected/i);
            }
        })(),
        ]);
    });

    it('should throw ValidationError when more than 5 fileIds are provided', async () => {
        const ZipServiceProxy = loadWithMocks(Errors);
        const services = makeSvcStubs();
        const proxy = new ZipServiceProxy(services);

        try {
        await proxy.zipFolder({ userId, folderId, fileIds: ['1', '2', '3', '4', '5', '6'] });
        throw new Error('Expected ValidationError');
        } catch (err) {
        expect(err).to.be.instanceOf(ValidationError);
        expect(err.message).to.match(/Maximum 5 files allowed/i);
        }
    });

    it('should filter files by selected fileIds (string compare on _id)', async () => {
        const ZipServiceProxy = loadWithMocks(Errors);

        const filesInFolder = [
        { _id: 'a', name: 'a.txt' },
        { _id: 'b', name: 'b.txt' },
        { _id: 123, name: 'num.txt' }, // number id; toString() === '123'
        { _id: 'c', name: 'c.txt' },
        ];
        const fileIds = ['b', '123'];

        const seenListCalls = [];
        const fileService = {
        listInFolder: async (uid, fid) => {
            seenListCalls.push([uid, fid]);
            return filesInFolder;
        },
        };

        const zipSpy = makeSpy();
        const zipService = {
        zipFolder: async ({ folder, files }) => { zipSpy(folder, files); return { ok: true, files }; },
        };

        const services = makeSvcStubs({ fileService, zipService });
        const proxy = new ZipServiceProxy(services);

        const result = await proxy.zipFolder({ userId, folderId, fileIds });

        expect(seenListCalls).to.have.length(1);
        expect(seenListCalls[0][0]).to.equal(userId);
        expect(seenListCalls[0][1]).to.equal(folderId);

        expect(zipSpy.calls).to.have.length(1);
        const [, passedFiles] = zipSpy.calls[0];
        expect(passedFiles.map(f => f._id.toString())).to.deep.equal(['b', '123']);

        expect(result).to.deep.equal({ ok: true, files: passedFiles });
    });

    it('should forward to zipService.zipFolder with { folder, files } and returns its response', async () => {
        const ZipServiceProxy = loadWithMocks(Errors);

        const filesInFolder = [{ _id: 'x', name: 'x.txt' }];
        const fileService = { listInFolder: async () => filesInFolder };

        const expectedResponse = { stream: { s: 1 }, filename: 'My Folder.zip', headers: { 'Content-Type': 'application/zip' } };
        const zipFolderSpy = makeSpy();
        const zipService = {
        zipFolder: async ({ folder, files }) => {
            zipFolderSpy(folder, files);
            return expectedResponse;
        },
        };

        const services = makeSvcStubs({ fileService, zipService });
        const proxy = new ZipServiceProxy(services);

        const resp = await proxy.zipFolder({ userId, folderId, fileIds: ['x'] });

        expect(zipFolderSpy.calls).to.have.length(1);
        const [passedFolder, passedFiles] = zipFolderSpy.calls[0];
        expect(passedFolder).to.deep.equal(baseFolder);
        expect(passedFiles).to.deep.equal(filesInFolder);

        expect(resp).to.equal(expectedResponse);
    });
});
