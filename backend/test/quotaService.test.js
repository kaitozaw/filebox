// test/quotaService.test.js
const { expect } = require('chai');
const EventEmitter = require('events');
const QuotaService = require('../services/QuotaService');

// Mock logger (overwrite writeLog to avoid actual file writes)
require('../utils/logger').writeLog = () => {};

describe('QuotaService', () => {
    let quotaService;
    let mockZipLogModel;
    let mockZipService;

    beforeEach(() => {
        // Manual mock for zipLogModel
        mockZipLogModel = {
            countDocuments: async (query) => {
                if (query.user === 'user-full') return 6; // over limit
                if (query.user === 'user-empty') return 0; // under limit
                return 3; // within limit
            },
            create: async (data) => data // return created data
        };

        // EventEmitter mock for zipService
        mockZipService = new EventEmitter();

        quotaService = new QuotaService({ zipLogModel: mockZipLogModel, zipService: mockZipService });
    });

    describe('checkQuota', () => {
        it('should return not over quota if count is under limit', async () => {
            const result = await quotaService.checkQuota('user-empty');
            expect(result.overQuota).to.be.false;
            expect(result.count).to.equal(0);
            expect(result.limit).to.equal(6);
        });

        it('should return over quota if count meets or exceeds limit', async () => {
            const result = await quotaService.checkQuota('user-full');
            expect(result.overQuota).to.be.true;
            expect(result.count).to.equal(6);
        });
    });

    describe('logZipDownload', () => {
        it('should log zip download to model', async () => {
            const res = await quotaService.logZipDownload('user1', 'folder1', 3);
            expect(res).to.be.undefined; // no return value expected
        });

        it('should not throw error if logging fails', async () => {
            quotaService.zipLogModel.create = async () => { throw new Error('DB fail') };
            try {
                await quotaService.logZipDownload('user1', 'folder1', 2);
            } catch (err) {
                throw new Error('Error should be caught inside logZipDownload');
            }
        });
    });

    describe('ZIP_CREATED event', () => {
        it('should call logZipDownload when ZIP_CREATED is emitted', async () => {
            let called = false;
            quotaService.logZipDownload = async () => { called = true; };

            mockZipService.emit('ZIP_CREATED', {
                userId: 'user-test',
                folderId: 'folder-test',
                fileCount: 2,
                timestamp: new Date()
            });

            // Wait for async event
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(called).to.be.true;
        });
    });
});