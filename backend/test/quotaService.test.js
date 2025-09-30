// test/quotaService.test.js
const { expect } = require('chai');
const { EventEmitter } = require('events');
const path = require('path');

describe('QuotaService', () => {
    const projectRoot = path.resolve(__dirname, '..'); // adjust if your tests live elsewhere
    const quotaServicePath = path.resolve(projectRoot, 'services/observer/QuotaService.js'); 

    // Derived from QuotaService's requires: '../../utils/logger' and '../../models/QuotaLog'
    const inferredUtilsLoggerPath = path.resolve(path.dirname(quotaServicePath), '../../utils/logger');
    const inferredQuotaLogModelPath = path.resolve(path.dirname(quotaServicePath), '../../models/QuotaLog');

    // Helper: load SUT with fresh mocks
    const loadWithMocks = (mocks) => {
        delete require.cache[quotaServicePath];
        delete require.cache[inferredUtilsLoggerPath];
        delete require.cache[inferredQuotaLogModelPath];

        require.cache[inferredUtilsLoggerPath] = { exports: mocks.utilsLogger };
        require.cache[inferredQuotaLogModelPath] = { exports: mocks.quotaLogModel };

        return require(quotaServicePath);
    };

    // Tiny spy (no sinon)
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

    // Allow async handlers to complete
    const tick = () => new Promise((r) => setImmediate(r));

    it('on ZIP_CREATED: creates a quota log and writes an audit message (success path)', async () => {
        const writeLogSpy = makeSpy();

        const createSpy = async (doc) => { createSpy.calls.push([doc]); };
        createSpy.calls = [];

        const QuotaService = loadWithMocks({
        utilsLogger: { writeLog: writeLogSpy },
        quotaLogModel: { create: createSpy, countDocuments: async () => 0 },
        });

        const zipService = new FakeZipService();
        // eslint-disable-next-line no-new
        new QuotaService({ zipService });

        zipService.emit('ZIP_CREATED', sampleEvent);
        await tick();

        // Assert create called with mapped fields
        expect(createSpy.calls).to.have.length(1);
        expect(createSpy.calls[0][0]).to.deep.equal({
        user: sampleEvent.userId,
        folder: sampleEvent.folderId,
        fileCount: sampleEvent.fileCount,
        createdAt: sampleEvent.timestamp,
        });

        // Assert writeLog called with formatted success message
        expect(writeLogSpy.calls).to.have.length(1);
        const [channel, message] = writeLogSpy.calls[0];
        expect(channel).to.equal('quota');
        expect(message).to.equal(
        `[ZIP_CREATED] user=${sampleEvent.userId} folder=${sampleEvent.folderId} files=${sampleEvent.fileCount} createdAt=${sampleEvent.timestamp} action=quotaLog`
        );
    });

    it('on ZIP_CREATED: logs a failure message when QuotaLog.create throws', async () => {
        const writeLogSpy = makeSpy();
        const err = new Error('DB write failed');
        const createFail = async () => { throw err; };

        const QuotaService = loadWithMocks({
        utilsLogger: { writeLog: writeLogSpy },
        quotaLogModel: { create: createFail, countDocuments: async () => 0 },
        });

        const zipService = new FakeZipService();
        // eslint-disable-next-line no-new
        new QuotaService({ zipService });

        zipService.emit('ZIP_CREATED', sampleEvent);
        await tick();

        expect(writeLogSpy.calls).to.have.length(1);
        const [channel, message] = writeLogSpy.calls[0];
        expect(channel).to.equal('quota');
        expect(message).to.equal(`Failed to record quota log: ${err.message}`);
    });

    it('does nothing when constructed without a zipService', async () => {
        const writeLogSpy = makeSpy();
        const createSpy = async () => { createSpy.calls.push([]); };
        createSpy.calls = [];

        const QuotaService = loadWithMocks({
        utilsLogger: { writeLog: writeLogSpy },
        quotaLogModel: { create: createSpy, countDocuments: async () => 0 },
        });

        // eslint-disable-next-line no-new
        new QuotaService({}); // no zipService provided
        await tick();

        expect(writeLogSpy.calls).to.have.length(0);
        expect(createSpy.calls).to.have.length(0);
    });

    it('checkQuota: returns overQuota=true when count > limit', async () => {
        const writeLogSpy = makeSpy();
        let receivedQuery = null;

        const countDocuments = async (q) => {
        receivedQuery = q;
        return 7; // > limit(6)
        };

        const QuotaService = loadWithMocks({
        utilsLogger: { writeLog: writeLogSpy },
        quotaLogModel: { create: async () => {}, countDocuments },
        });

        const qs = new QuotaService({}); // zipService not needed for this test
        const res = await qs.checkQuota('user-999');

        // Assert structure/values
        expect(res).to.deep.equal({
        overQuota: true,
        count: 7,
        limit: 6,
        windowMinutes: 1,
        retryAfterSeconds: 60,
        });

        // Assert the query shape
        expect(receivedQuery).to.have.property('user', 'user-999');
        expect(receivedQuery).to.have.property('createdAt');
        expect(receivedQuery.createdAt).to.have.property('$gte');
        expect(receivedQuery.createdAt.$gte).to.be.instanceOf(Date);

        // Make sure cutoff is roughly "within the last ~2 minutes"
        const now = Date.now();
        const cutoffMs = receivedQuery.createdAt.$gte.getTime();
        expect(cutoffMs).to.be.at.most(now);
        expect(cutoffMs).to.be.at.least(now - 2 * 60 * 1000);
    });

    it('checkQuota: returns overQuota=false when count <= limit', async () => {
        const writeLogSpy = makeSpy();

        const QuotaService = loadWithMocks({
        utilsLogger: { writeLog: writeLogSpy },
        quotaLogModel: {
            create: async () => {},
            countDocuments: async () => 6, // == limit
        },
        });

        const qs = new QuotaService({});
        const res = await qs.checkQuota('user-abc');

        expect(res).to.deep.equal({
        overQuota: false,
        count: 6,
        limit: 6,
        windowMinutes: 1,
        retryAfterSeconds: 60,
        });
    });
});
