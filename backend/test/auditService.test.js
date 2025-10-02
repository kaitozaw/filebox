const { expect } = require('chai');
const { EventEmitter } = require('events');
const path = require('path');
const Module = require('module');

const projectRoot = path.resolve(__dirname, '..');
const auditServicePath = path.resolve(projectRoot, 'services/observer/AuditService.js');

const resolveFromSUT = (request) => {
    const basedir = path.dirname(auditServicePath);
    return Module._resolveFilename(request, {
        id: auditServicePath,
        filename: auditServicePath,
        paths: Module._nodeModulePaths(basedir),
    });
    };

    const resolvedLoggerId   = resolveFromSUT('../../utils/logger');
    const resolvedAuditLogId = resolveFromSUT('../../models/AuditLog');

    const loadWithMocks = (mocks) => {
    // clear caches
    [auditServicePath, resolvedLoggerId, resolvedAuditLogId].forEach((id) => delete require.cache[id]);

    // install mocks under the exact IDs AuditService will require
    require.cache[resolvedLoggerId]   = { exports: mocks.logger };
    require.cache[resolvedAuditLogId] = { exports: mocks.auditLogModel };

    // load SUT
    return require(auditServicePath);
    };

    // tiny spy
    const makeSpy = () => {
    const calls = [];
    const fn = (...args) => { calls.push(args); };
    fn.calls = calls;
    return fn;
    };

    class FakeZipService extends EventEmitter {}
    const tick = () => new Promise((r) => setImmediate(r));

    describe('AuditService', () => {
    const sampleEvent = {
        userId: 'user-123',
        folderId: 'folder-456',
        fileCount: 7,
        timestamp: '2025-09-30T01:23:45.000Z',
    };

    it('registers ZIP_CREATED listener and writes audit record + log on success', async () => {
        const writeLogSpy = makeSpy();
        const createSpy = async (doc) => { createSpy.calls.push([doc]); };
        createSpy.calls = [];

        const AuditService = loadWithMocks({
        logger: { writeLog: writeLogSpy },
        auditLogModel: { create: createSpy },
        });

        const zipService = new FakeZipService();
        // eslint-disable-next-line no-new
        new AuditService({ zipService });

        zipService.emit('ZIP_CREATED', sampleEvent);
        await tick(); // allow async handler to run

        expect(createSpy.calls).to.have.length(1);
        expect(createSpy.calls[0][0]).to.deep.equal({
        user: sampleEvent.userId,
        folder: sampleEvent.folderId,
        fileCount: sampleEvent.fileCount,
        createdAt: sampleEvent.timestamp,
        });

        expect(writeLogSpy.calls).to.have.length(1);
        const [channel, message] = writeLogSpy.calls[0];
        expect(channel).to.equal('audit');
        expect(message).to.equal(
        `[ZIP_CREATED] user=${sampleEvent.userId} folder=${sampleEvent.folderId} files=${sampleEvent.fileCount} createdAt=${sampleEvent.timestamp} action=auditLog`
        );
    });

    it('logs a failure message if AuditLog.create throws', async () => {
        const writeLogSpy = makeSpy();
        const error = new Error('DB write failed');
        const createFail = async () => { throw error; };

        const AuditService = loadWithMocks({
        logger: { writeLog: writeLogSpy },
        auditLogModel: { create: createFail },
        });

        const zipService = new FakeZipService();
        // eslint-disable-next-line no-new
        new AuditService({ zipService });

        zipService.emit('ZIP_CREATED', sampleEvent);
        await tick();

        expect(writeLogSpy.calls).to.have.length(1);
        const [channel, message] = writeLogSpy.calls[0];
        expect(channel).to.equal('audit');
        expect(message).to.equal(`Failed to record audit log: ${error.message}`);
    });

    it('does nothing when constructed without a zipService', async () => {
        const writeLogSpy = makeSpy();
        const createSpy = async () => { createSpy.calls.push([]); };
        createSpy.calls = [];

        const AuditService = loadWithMocks({
        logger: { writeLog: writeLogSpy },
        auditLogModel: { create: createSpy },
        });

        // eslint-disable-next-line no-new
        new AuditService({});
        await tick();

        expect(createSpy.calls).to.have.length(0);
        expect(writeLogSpy.calls).to.have.length(0);
    });
});
