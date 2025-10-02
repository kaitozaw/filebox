const { expect } = require('chai');
const { EventEmitter } = require('events');
const path = require('path');
const Module = require('module');


const projectRoot = path.resolve(__dirname, '..');
const quotaServicePath = path.resolve(projectRoot, 'services/observer/QuotaService.js'); 

const resolveFromSUT = (request) => {
    const basedir = path.dirname(quotaServicePath);
    return Module._resolveFilename(request, {
        id: quotaServicePath,
        filename: quotaServicePath,
        paths: Module._nodeModulePaths(basedir),
    });
    };

    const resolvedUtilsLoggerId = resolveFromSUT('../../utils/logger');
    const resolvedQuotaLogId   = resolveFromSUT('../../models/QuotaLog');

    const loadWithMocks = ({ utilsLogger, quotaLogModel }) => {
    [quotaServicePath, resolvedUtilsLoggerId, resolvedQuotaLogId].forEach((id) => delete require.cache[id]);
    require.cache[resolvedUtilsLoggerId] = { exports: utilsLogger };
    require.cache[resolvedQuotaLogId]    = { exports: quotaLogModel };
    return require(quotaServicePath);
    };

    const makeSpy = () => {
    const calls = [];
    const fn = (...args) => { calls.push(args); };
    fn.calls = calls;
    return fn;
    };
    const tick = () => new Promise((r) => setImmediate(r));

    class FakeZipService extends EventEmitter {}

    describe('QuotaService tests', () => {
    const sampleEvent = {
        userId: 'user-123',
        folderId: 'folder-456',
        fileCount: 7,
        timestamp: '2025-09-30T01:23:45.000Z',
    };

    it('on ZIP_CREATED: should create a quota log and writes a log message (success path)', async () => {
        const writeLogSpy = makeSpy();
        const createSpy = async (doc) => { createSpy.calls.push([doc]); };
        createSpy.calls = [];

        const QuotaService = loadWithMocks({
        utilsLogger: { writeLog: writeLogSpy },
        quotaLogModel: { create: createSpy, countDocuments: async () => 0 },
        });

        const zipService = new FakeZipService();
        new QuotaService({ zipService });

        zipService.emit('ZIP_CREATED', sampleEvent);
        await tick();

        expect(createSpy.calls).to.have.length(1);
        expect(createSpy.calls[0][0]).to.deep.equal({
        user: sampleEvent.userId,
        folder: sampleEvent.folderId,
        fileCount: sampleEvent.fileCount,
        createdAt: sampleEvent.timestamp,
        });

        expect(writeLogSpy.calls).to.have.length(1);
        const [channel, message] = writeLogSpy.calls[0];
        expect(channel).to.equal('quota');
        expect(message).to.equal(
        `[ZIP_CREATED] user=${sampleEvent.userId} folder=${sampleEvent.folderId} files=${sampleEvent.fileCount} createdAt=${sampleEvent.timestamp} action=quotaLog`
        );
    });

    it('on ZIP_CREATED: should log a failure message when QuotaLog.create throws', async () => {
        const writeLogSpy = makeSpy();
        const err = new Error('DB write failed');

        const QuotaService = loadWithMocks({
        utilsLogger: { writeLog: writeLogSpy },
        quotaLogModel: { create: async () => { throw err; }, countDocuments: async () => 0 },
        });

        const zipService = new FakeZipService();
        new QuotaService({ zipService });

        zipService.emit('ZIP_CREATED', sampleEvent);
        await tick();

        expect(writeLogSpy.calls).to.have.length(1);
        const [channel, message] = writeLogSpy.calls[0];
        expect(channel).to.equal('quota');
        expect(message).to.equal(`Failed to record quota log: ${err.message}`);
    });

    it('should do nothing when constructed without a zipService', async () => {
        const writeLogSpy = makeSpy();
        const createSpy = async () => { createSpy.calls.push([]); };
        createSpy.calls = [];

        const QuotaService = loadWithMocks({
        utilsLogger: { writeLog: writeLogSpy },
        quotaLogModel: { create: createSpy, countDocuments: async () => 0 },
        });

        new QuotaService({});
        await tick();

        expect(createSpy.calls).to.have.length(0);
        expect(writeLogSpy.calls).to.have.length(0);
    });

    it('checkQuota: should return overQuota=true when count > limit', async () => {
        let receivedQuery = null;

        const QuotaService = loadWithMocks({
        utilsLogger: { writeLog: () => {} },
        quotaLogModel: {
            countDocuments: async (q) => { receivedQuery = q; return 7; },
        },
        });

        const svc = new QuotaService({});
        const res = await svc.checkQuota('user-xyz');

        expect(res).to.deep.equal({
        overQuota: true,
        count: 7,
        limit: 6,
        windowMinutes: 1,
        retryAfterSeconds: 60,
        });

        expect(receivedQuery).to.have.property('user', 'user-xyz');
        expect(receivedQuery).to.have.property('createdAt');
        expect(receivedQuery.createdAt).to.have.property('$gte');
        expect(receivedQuery.createdAt.$gte).to.be.instanceOf(Date);
    });

    it('checkQuota: should return overQuota=false when count <= limit', async () => {
        const QuotaService = loadWithMocks({
        utilsLogger: { writeLog: () => {} },
        quotaLogModel: { countDocuments: async () => 6 },
        });

        const svc = new QuotaService({});
        const res = await svc.checkQuota('user-abc');

        expect(res).to.deep.equal({
        overQuota: false,
        count: 6,
        limit: 6,
        windowMinutes: 1,
        retryAfterSeconds: 60,
        });
    });
});
