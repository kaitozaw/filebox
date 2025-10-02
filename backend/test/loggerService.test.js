// test/LoggerService.test.js
const { expect } = require('chai');
const { EventEmitter } = require('events');
const path = require('path');
const Module = require('module');


const projectRoot = path.resolve(__dirname, '..');
const loggerServicePath = path.resolve(projectRoot, 'services/observer/LoggerService.js');

// Resolve dependency IDs exactly as LoggerService.js will
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
    // Clear caches so our mocks take effect
    [loggerServicePath, resolvedUtilsLoggerId].forEach((id) => delete require.cache[id]);

    // Install mocks under the exact resolved IDs
    require.cache[resolvedUtilsLoggerId] = { exports: mocks.utilsLogger };

    // Load SUT: since module.exports = LoggerService, this returns the class directly
    return require(loggerServicePath);
    };

    // tiny spy (no sinon)
    const makeSpy = () => {
    const calls = [];
    const fn = (...args) => { calls.push(args); };
    fn.calls = calls;
    return fn;
    };

    class FakeZipService extends EventEmitter {}
    const tick = () => new Promise((r) => setImmediate(r));

    describe('LoggerService', () => {
    it('logs a formatted message when ZIP_CREATED is emitted', async () => {
        const writeLogSpy = makeSpy();

        const LoggerService = loadWithMocks({
        utilsLogger: { writeLog: writeLogSpy },
        });

        const zipService = new FakeZipService();
        // construct service (attaches listener)
        // eslint-disable-next-line no-new
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

    it('does nothing when constructed without a zipService', async () => {
        const writeLogSpy = makeSpy();

        const LoggerService = loadWithMocks({
        utilsLogger: { writeLog: writeLogSpy },
        });

        // eslint-disable-next-line no-new
        new LoggerService({});
        await tick();

        expect(writeLogSpy.calls).to.have.length(0);
    });
});
