const path = require('path');
const hasher = require('./hasher');
const tokenUtil = require('./tokenUtil');

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
const ZipService = require('../services/ZipService');
const QuotaService = require('../services/QuotaService');
const AuditService = require('../services/AuditService');
const LoggerService = require('../services/LoggerService');
const ZipAccessProxy = require('../services/ZipAccessProxy');

const ZipLog = require('../models/ZipLog');
const AuditLog = require('../models/AuditLog');

function createContainer() {
    const storage = new LocalStorage({
        baseDir: path.resolve(__dirname, '..', 'uploads'),
    });
  
    const userService = new UserService({ hasher, tokenUtil });
    const folderService = new FolderService();
    const fileService = new FileService({ storage });
    const recentService = new RecentService();
    const zipService = new ZipService({ fileService, folderService });
    const quotaService = new QuotaService({ zipService, zipLogModel: ZipLog });
    const auditService = new AuditService({ zipService, auditLogModel: AuditLog });
    const loggerService = new LoggerService({ zipService});
    const zipAccessProxy = new ZipAccessProxy({ zipService, folderService, fileService, quotaService, auditService });
    
    const authController = new AuthController({ userService });
    const folderController = new FolderController({ folderService });
    const fileController = new FileController({ fileService });
    const recentController = new RecentController({ recentService });
    const zipController = new ZipController({ zipAccessProxy });
    
    return {
        services: { userService, folderService, fileService, recentService, zipService, zipAccessProxy, quotaService, loggerService, auditService},
        controllers: { authController, folderController, fileController, recentController, zipController },
    };
}

module.exports = { createContainer };