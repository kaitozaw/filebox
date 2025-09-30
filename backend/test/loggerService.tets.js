// test/loggerService.test.js
const { expect } = require('chai');
const { EventEmitter } = require('events');
const path = require('path');

describe('LoggerService', () => {
    // Paths to the module-under-test and its dependencies (to be mocked)
    const projectRoot = path.resolve(__dirname, '..'); // adjust if your tests live elsewhere
    const loggerServicePath = path.resolve(projectRoot, 'services/observer/LoggerService.js'); 

    // These are derived from how LoggerService requires them: '../../utils/logger'
    const inferredUtilsLoggerPath = path.resolve(path.dirname(loggerServicePath), '../../utils/logger');

    // Helper: load the module-under-test with fresh mocks each time
    const loadWithMocks = (mocks) => {
        // clear caches so stubs take effect
        delete require.cache[loggerServicePath];
        delete require.cache[inferredUtilsLoggerPath];

        // install mocks in the require cache
        require.cache[inferredUtilsLoggerPath] = { exports: mocks.utilsLogger };

        // load SUT (will read our mocks)
        return require(loggerServicePath);
    };

    // tiny spy util (no sinon)
    const makeSpy = () => {
        const calls = [];
        const fn = (...args) => { calls.push(args); };
        fn.calls = calls;
        return fn;
    };

    class FakeZipService extends EventEmitter {}

    const sampleEvent = {
        userId: 'user-123',
        folderId: 'folder-456',
        fileCount: 7,
        timestamp: '2025-09-30T01:23:45.000Z',
    };

    // ensure async listeners have a chance to run (even though LoggerService uses sync handler)
    const tick = () => new Promise((r) => setImmediate(r));

    it('logs a formatted message when ZIP_CREATED is emitted', async () => {
        const writeLogSpy = makeSpy();

        const LoggerService = loadWithMocks({
        utilsLogger: { writeLog: writeLogSpy },
        });

        const zipService = new FakeZipService();

        // construct service (attaches listener)
        // eslint-disable-next-line no-new
        new LoggerService({ zipService });

        // emit event
        zipService.emit('ZIP_CREATED', sampleEvent);
        await tick();

        // assert writeLog called exactly once
        expect(writeLogSpy.calls).to.have.length(1);

        const [channel, message] = writeLogSpy.calls[0];
        expect(channel).to.equal('logger');
        expect(message).to.equal(
        `[ZIP_CREATED] user=${sampleEvent.userId} folder=${sampleEvent.folderId} files=${sampleEvent.fileCount} createdAt=${sampleEvent.timestamp}`
        );
    });

    it('does nothing when constructed without a zipService', async () => {
        const writeLogSpy = makeSpy();

        const LoggerService = loadWithMocks({
        utilsLogger: { writeLog: writeLogSpy },
        });

        // eslint-disable-next-line no-new
        new LoggerService({}); // no zipService provided

        // no events to emit; ensure no calls were made
        await tick();
        expect(writeLogSpy.calls).to.have.length(0);
    });
});
