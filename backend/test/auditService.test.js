// test/auditService.test.js
const { expect } = require('chai');
const { EventEmitter } = require('events');
const path = require('path');

describe('AuditService', () => {
    const projectRoot = path.resolve(__dirname, '..'); // adjust if your tests live elsewhere
    const auditServicePath = path.resolve(projectRoot, 'servies/observer/AuditService.js'); 
    const loggerPath = path.resolve(path.dirname(auditServicePath), '../../utils/logger');
    const auditLogModelPath = path.resolve(path.dirname(auditServicePath), '../../models/AuditLog');

    // Helpers to (re)load module-under-test with fresh mocks each test
    const loadWithMocks = (mocks) => {
        // Wipe any previous cached modules so our stubs take effect
        delete require.cache[auditServicePath];
        delete require.cache[loggerPath];
        delete require.cache[auditLogModelPath];

        // Install mocks into require cache
        require.cache[loggerPath] = { exports: mocks.logger };
        require.cache[auditLogModelPath] = { exports: mocks.auditLogModel };

        // Now require the module-under-test, which will see our mocks
        return require(auditServicePath);
    };

    // Simple spy recorder without external libs
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

    // Utility: wait for async handlers to run after emit
    const tick = () => new Promise((r) => setImmediate(r));

    it('registers ZIP_CREATED listener and writes audit record + log on success', async () => {
        // Arrange: mocks
        const writeLogSpy = makeSpy();
        const createSpy = async (doc) => { createSpy.calls.push([doc]); };
        createSpy.calls = [];

        const AuditService = loadWithMocks({
        logger: { writeLog: writeLogSpy },
        auditLogModel: { create: createSpy },
        });

        const zipService = new FakeZipService();

        // Act: construct service (attaches listener), then emit event
        // eslint-disable-next-line no-new
        new AuditService({ zipService });
        zipService.emit('ZIP_CREATED', sampleEvent);
        await tick();

        // Assert: AuditLog.create called with expected document
        expect(createSpy.calls).to.have.length(1);
        expect(createSpy.calls[0][0]).to.deep.equal({
        user: sampleEvent.userId,
        folder: sampleEvent.folderId,
        fileCount: sampleEvent.fileCount,
        createdAt: sampleEvent.timestamp,
        });

        // Assert: writeLog called once with formatted message
        expect(writeLogSpy.calls).to.have.length(1);
        const [channel, message] = writeLogSpy.calls[0];
        expect(channel).to.equal('audit');
        expect(message).to.equal(
        `[ZIP_CREATED] user=${sampleEvent.userId} folder=${sampleEvent.folderId} files=${sampleEvent.fileCount} createdAt=${sampleEvent.timestamp} action=auditLog`
        );
    });

    it('logs a failure message if AuditLog.create throws', async () => {
        // Arrange: failing create
        const writeLogSpy = makeSpy();
        const error = new Error('DB write failed');
        const createFail = async () => { throw error; };

        const AuditService = loadWithMocks({
        logger: { writeLog: writeLogSpy },
        auditLogModel: { create: createFail },
        });

        const zipService = new FakeZipService();

        // Act
        // eslint-disable-next-line no-new
        new AuditService({ zipService });
        zipService.emit('ZIP_CREATED', sampleEvent);
        await tick();

        // Assert: writeLog called with failure note
        expect(writeLogSpy.calls).to.have.length(1);
        const [channel, message] = writeLogSpy.calls[0];
        expect(channel).to.equal('audit');
        expect(message).to.equal(`Failed to record audit log: ${error.message}`);
    });

    it('does nothing when constructed without a zipService', async () => {
        // Arrange: spies should never be called since no listener is attached
        const writeLogSpy = makeSpy();
        const createSpy = async () => { createSpy.calls.push([]); };
        createSpy.calls = [];

        const AuditService = loadWithMocks({
        logger: { writeLog: writeLogSpy },
        auditLogModel: { create: createSpy },
        });

        // Act
        // eslint-disable-next-line no-new
        new AuditService({}); // no zipService provided
        // (No event to emit)

        // Assert
        expect(createSpy.calls).to.have.length(0);
        expect(writeLogSpy.calls).to.have.length(0);
    });
});
