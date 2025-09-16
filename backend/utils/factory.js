const path = require('path');
const hasher = require('./hasher');
const tokenUtil = require('./tokenUtil');
const QuotaLog = require('../models/QuotaLog');
const AuditLog = require('../models/AuditLog');

const { AuthController } = require('../controllers/AuthController');
const { FolderController } = require('../controllers/FolderController');
const { FileController } = require('../controllers/FileController');
const { RecentController } = require('../controllers/RecentController');
const { ZipController } = require('../controllers/ZipController');

const LocalStorage = require('../services/storage/LocalStorage');
const UserService = require('../services/UserService');
const FolderService = require('../services/FolderService');
const FileService = require('../services/FileService');
const RecentService = require('../services/RecentService');
const ZipService = require('../services/zip/ZipService');
const QuotaService = require('../services/observer/QuotaService');
const AuditService = require('../services/observer/AuditService');
const LoggerService = require('../services/observer/LoggerService');
const ZipServiceProxy = require('../services/zip/ZipServiceProxy');

function createContainer() {
    const storage = new LocalStorage({ baseDir: path.resolve(__dirname, '..', 'uploads') });
    const userService = new UserService({ hasher, tokenUtil });
    const folderService = new FolderService();
    const fileService = new FileService({ storage });
    const recentService = new RecentService();
    const zipService = new ZipService({ fileService });
    const quotaService = new QuotaService({ zipService });
    const auditService = new AuditService({ zipService });
    const loggerService = new LoggerService({ zipService});
    const zipServiceProxy = new ZipServiceProxy({ folderService, fileService, zipService, quotaService });
    
    const authController = new AuthController({ userService });
    const folderController = new FolderController({ folderService });
    const fileController = new FileController({ fileService });
    const recentController = new RecentController({ recentService });
    const zipController = new ZipController({ zipServiceProxy });
    
    return {
        services: { userService, folderService, fileService, recentService, zipService, quotaService, auditService, loggerService, zipServiceProxy },
        controllers: { authController, folderController, fileController, recentController, zipController },
    };
}

module.exports = { createContainer };