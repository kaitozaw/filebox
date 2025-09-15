// test/auditService.test.js
const { expect } = require('chai');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const AuditService = require('../services/AuditService');

// Mock model
class FakeAuditLogModel {
    constructor() {
        this.entries = [];
    }

    async create(data) {
        this.entries.push(data);
        return data;
    }
    }

    describe('AuditService', () => {
    const logDir = path.resolve(__dirname, '../logs');
    const logFile = path.join(logDir, 'audit.log');
    let zipService;
    let auditLogModel;

    before(() => {
        if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
        }
    });

    beforeEach(() => {
        zipService = new EventEmitter();
        auditLogModel = new FakeAuditLogModel();
        if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    });

    it('should write to audit log and create audit entry on ZIP_CREATED event', (done) => {
        new AuditService({ zipService, auditLogModel });

        const event = {
        userId: 'user001',
        folderId: 'folderABC',
        fileCount: 2,
        timestamp: new Date().toISOString(),
        };

        zipService.emit('ZIP_CREATED', event);

        setTimeout(() => {
        // Audit log written
        expect(fs.existsSync(logFile)).to.be.true;
        const contents = fs.readFileSync(logFile, 'utf8');
        expect(contents).to.include(`User ${event.userId}`);
        expect(contents).to.include(`Folder ${event.folderId}`);

        // Audit entry created
        expect(auditLogModel.entries.length).to.equal(1);
        const entry = auditLogModel.entries[0];
        expect(entry.user).to.equal(event.userId);
        expect(entry.folder).to.equal(event.folderId);
        expect(entry.fileCount).to.equal(event.fileCount);
        done();
        }, 50);
    });
});