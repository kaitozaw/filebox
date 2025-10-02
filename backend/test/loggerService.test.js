const { expect } = require('chai');
const { EventEmitter } = require('events');
const path = require('path');
const Module = require('module');


const projectRoot = path.resolve(__dirname, '..');
const loggerServicePath = path.resolve(projectRoot, 'services/observer/LoggerService.js');

const resolveFromSUT = (request) => {
    const basedir = path.dirname(loggerServicePath);
    return Module._resolveFilename(request, {
        id: loggerServicePath,
        filename: loggerServicePath,
        paths: Module._nodeModulePaths(basedir),
    });
    };

    const resolvedUtilsLoggerId = resolveFromSUT('../../utils/logger');

    const loadWithMocks = (mocks) => {
    [loggerServicePath, resolvedUtilsLoggerId].forEach((id) => delete require.cache[id]);

    require.cache[resolvedUtilsLoggerId] = { exports: mocks.utilsLogger };

    return require(loggerServicePath);
    };

    const makeSpy = () => {
    const calls = [];
    const fn = (...args) => { calls.push(args); };
    fn.calls = calls;
    return fn;
    };

    class FakeZipService extends EventEmitter {}
    const tick = () => new Promise((r) => setImmediate(r));

    describe('LoggerService', () => {
    it('should log a formatted message when ZIP_CREATED is emitted', async () => {
        const writeLogSpy = makeSpy();

        const LoggerService = loadWithMocks({
        utilsLogger: { writeLog: writeLogSpy },
        });

        const zipService = new FakeZipService();
        new LoggerService({ zipService });

        const event = {
        userId: 'user-123',
        folderId: 'folder-456',
        fileCount: 7,
        timestamp: '2025-09-30T01:23:45.000Z',
        };

        zipService.emit('ZIP_CREATED', event);
        await tick();

        expect(writeLogSpy.calls).to.have.length(1);
        const [channel, message] = writeLogSpy.calls[0];
        expect(channel).to.equal('logger');
        expect(message).to.equal(
        `[ZIP_CREATED] user=${event.userId} folder=${event.folderId} files=${event.fileCount} createdAt=${event.timestamp}`
        );
    });

    it('should do nothing when constructed without a zipService', async () => {
        const writeLogSpy = makeSpy();

        const LoggerService = loadWithMocks({
        utilsLogger: { writeLog: writeLogSpy },
        });

        new LoggerService({});
        await tick();

        expect(writeLogSpy.calls).to.have.length(0);
    });
});
