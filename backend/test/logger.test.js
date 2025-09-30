// test/logger.test.js
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

// Import the function under test
const { writeLog } = require('../utils/logger'); // <-- adjust path if needed

// Temporary logs folder for testing
const TEST_LOG_DIR = path.resolve(__dirname, 'tmp-logs');

describe('logger.writeLog', () => {
    const serviceName = 'testService';
    const logFilePath = path.join(TEST_LOG_DIR, `${serviceName}.log`);

    // Clean up before/after each test
    beforeEach(() => {
        if (fs.existsSync(TEST_LOG_DIR)) {
        fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(TEST_LOG_DIR);
    });

    afterEach(() => {
        if (fs.existsSync(TEST_LOG_DIR)) {
        fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
        }
    });

    it('creates the log directory if it does not exist and writes a log entry', (done) => {
        // Override __dirname resolution to point logs inside TEST_LOG_DIR
        const originalResolve = path.resolve;
        path.resolve = (...args) => {
        if (args.includes('..') && args.includes('logs')) {
            return TEST_LOG_DIR; // force logs into tmp-logs
        }
        return originalResolve(...args);
        };

        writeLog(serviceName, 'Hello world');

        // Give async appendFile a moment to complete
        setTimeout(() => {
        const content = fs.readFileSync(logFilePath, 'utf-8');
        expect(content).to.match(/\[.*\] Hello world/);
        path.resolve = originalResolve; // restore
        done();
        }, 100);
    });

    it('appends multiple messages to the same file', (done) => {
        const originalResolve = path.resolve;
        path.resolve = (...args) => {
        if (args.includes('..') && args.includes('logs')) {
            return TEST_LOG_DIR;
        }
        return originalResolve(...args);
        };

        writeLog(serviceName, 'First line');
        writeLog(serviceName, 'Second line');

        setTimeout(() => {
        const content = fs.readFileSync(logFilePath, 'utf-8');
        expect(content).to.include('First line');
        expect(content).to.include('Second line');
        // Ensure they are on separate lines
        const lines = content.trim().split('\n');
        expect(lines).to.have.length(2);
        path.resolve = originalResolve;
        done();
        }, 200);
    });
});
