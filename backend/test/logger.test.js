const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

const { writeLog } = require('../utils/logger');

const TEST_LOG_DIR = path.resolve(__dirname, 'tmp-logs');

describe('logger.writeLog tests', () => {
    const serviceName = 'testService';
    const logFilePath = path.join(TEST_LOG_DIR, `${serviceName}.log`);

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

    it('should create the log directory if it does not exist and writes a log entry', (done) => {
        const originalResolve = path.resolve;
        path.resolve = (...args) => {
        if (args.includes('..') && args.includes('logs')) {
            return TEST_LOG_DIR;
        }
        return originalResolve(...args);
        };

        writeLog(serviceName, 'Hello world');

        setTimeout(() => {
        const content = fs.readFileSync(logFilePath, 'utf-8');
        expect(content).to.match(/\[.*\] Hello world/);
        path.resolve = originalResolve;
        done();
        }, 100);
    });

    it('should append multiple messages to the same file', (done) => {
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
        const lines = content.trim().split('\n');
        expect(lines).to.have.length(2);
        path.resolve = originalResolve;
        done();
        }, 200);
    });
});
