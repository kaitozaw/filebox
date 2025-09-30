// test/zipServiceProxy.test.js
const { expect } = require('chai');
const path = require('path');

describe('ZipServiceProxy', () => {
    const projectRoot = path.resolve(__dirname, '..'); // adjust if tests live elsewhere
    const zipServiceProxyPath = path.resolve(projectRoot, 'services/zip/ZipServiceProxy.js'); 

    // Module IDs resolved relative to ZipServiceProxy:
    //   '../../utils/errors'
    const inferredErrorsPath = path.resolve(path.dirname(zipServiceProxyPath), '../../utils/errors');

    // Helpers to load SUT with mocks
    const loadWithMocks = (errorsExport) => {
        delete require.cache[zipServiceProxyPath];
        delete require.cache[inferredErrorsPath];

        require.cache[inferredErrorsPath] = { exports: errorsExport };

        return require(zipServiceProxyPath);
    };

    // Tiny spy recorder (no sinon)
    const makeSpy = () => {
        const calls = [];
        const fn = (...args) => { calls.push(args); };
        fn.calls = calls;
        return fn;
    };

    // Fake error classes (so we can instanceof them)
    class ValidationError extends Error {}
    class ForbiddenError extends Error {}
    class NotFoundError extends Error {}
    class TooManyRequestsError extends Error {}

    const Errors = { ValidationError, ForbiddenError, NotFoundError, TooManyRequestsError };

    // Sample inputs
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

    it('throws NotFoundError when folder does not exist', async () => {
        const { ZipServiceProxy } = loadWithMocks(Errors);
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

    it('throws ForbiddenError when folder user does not match', async () => {
        const { ZipServiceProxy } = loadWithMocks(Errors);
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

    it('throws TooManyRequestsError when over quota', async () => {
        const { ZipServiceProxy } = loadWithMocks(Errors);
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

    it('throws ValidationError when no fileIds are provided', async () => {
        const { ZipServiceProxy } = loadWithMocks(Errors);
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

    it('throws ValidationError when more than 5 fileIds are provided', async () => {
        const { ZipServiceProxy } = loadWithMocks(Errors);
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

    it('filters files by selected fileIds (string compare on _id)', async () => {
        const { ZipServiceProxy } = loadWithMocks(Errors);

        const filesInFolder = [
        { _id: 'a', name: 'a.txt' },
        { _id: 'b', name: 'b.txt' },
        { _id: 123, name: 'num.txt' }, // number _id, will be toString() === '123'
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

        // Ensure listInFolder called with (userId, folderId)
        expect(seenListCalls).to.have.length(1);
        expect(seenListCalls[0][0]).to.equal(userId);
        expect(seenListCalls[0][1]).to.equal(folderId);

        // Ensure filtering: only 'b' and '123'
        expect(zipSpy.calls).to.have.length(1);
        const [, passedFiles] = zipSpy.calls[0];
        expect(passedFiles.map(f => f._id.toString())).to.deep.equal(['b', '123']);

        // Result is whatever zipService returned
        expect(result).to.deep.equal({ ok: true, files: passedFiles });
    });

    it('forwards to zipService.zipFolder with { folder, files } and returns its response (happy path)', async () => {
        const { ZipServiceProxy } = loadWithMocks(Errors);

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

        // zipService called with folder and filtered files
        expect(zipFolderSpy.calls).to.have.length(1);
        const [passedFolder, passedFiles] = zipFolderSpy.calls[0];
        expect(passedFolder).to.deep.equal(baseFolder);
        expect(passedFiles).to.deep.equal(filesInFolder);

        // returns exactly zipService's response
        expect(resp).to.equal(expectedResponse);
    });
});
