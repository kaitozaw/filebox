// test/loggerService.test.js
const { expect } = require('chai');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const LoggerService = require('../services/LoggerService');

// Utility to read the last line of the log file
function readLastLogLine(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    return lines[lines.length - 1];
    }

    describe('LoggerService', () => {
    const logDir = path.resolve(__dirname, '../logs');
    const logFile = path.join(logDir, 'logger.log');
    let zipService;

    before(() => {
        if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
        }
    });

    beforeEach(() => {
        zipService = new EventEmitter();
        if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    });

    it('should write a log entry when ZIP_CREATED is emitted', (done) => {
        new LoggerService({ zipService });

        const testEvent = {
        userId: 'user123',
        folderId: 'folder456',
        fileCount: 3,
        timestamp: new Date().toISOString(),
        };

        zipService.emit('ZIP_CREATED', testEvent);

        // Allow async log write to complete
        setTimeout(() => {
        expect(fs.existsSync(logFile)).to.be.true;

        const lastLine = readLastLogLine(logFile);
        expect(lastLine).to.include(`User ${testEvent.userId}`);
        expect(lastLine).to.include(`folder ${testEvent.folderId}`);
        expect(lastLine).to.include(`${testEvent.fileCount} files`);
        done();
        }, 50);
    });
});