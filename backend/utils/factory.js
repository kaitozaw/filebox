const path = require('path');

const { AuthController } = require('../controllers/AuthController');
const { FolderController } = require('../controllers/FolderController');
const { FileController } = require('../controllers/FileController');
const { ZipController } = require('../controllers/ZipController');

const UserService = require('../services/UserService');
const FolderService = require('../services/FolderService');
const FileService = require('../services/FileService');
const ZipService = require('../services/ZipService');
const ZipAccessProxy = require('../services/ZipAccessProxy');
const LocalStorage = require('../services/storage/LocalStorage');
const QuotaService = require('../services/QuotaService');
const ZipLog = require('../models/ZipLog');
const LoggerService = require('../services/LoggerService');
const AuditService = require('../services/AuditService');
const AuditLog = require('../models/AuditLog');


const hasher = require('./hasher');
const tokenUtil = require('./tokenUtil');

function createContainer() {
    const storage = new LocalStorage({
        baseDir: path.resolve(__dirname, '..', 'uploads'),
    });
    //1. Services
    const userService = new UserService({ hasher, tokenUtil });
    const folderService = new FolderService();
    const fileService = new FileService({ storage });
    const zipService = new ZipService({ fileService, folderService });

    // Observer pattern: QuotaService + LoggerService both subscribe to zipService events
    const quotaService = new QuotaService({ zipLogModel: ZipLog, zipService });
    const loggerService = new LoggerService({ zipService});
    const auditService = new AuditService({ zipService, auditLogModel: AuditLog });


    //2. Proxy (wrap ZipService with access control)
    const zipAccessProxy = new ZipAccessProxy({ zipService, folderService, fileService, quotaService, auditService });

    //3. Controllers
    const authController = new AuthController({ userService });
    const folderController = new FolderController({ folderService });
    const fileController = new FileController({ fileService });    
    const zipController = new ZipController({ zipAccessProxy });
    
    

    return {
        services: { userService, folderService, fileService, zipService, zipAccessProxy, quotaService, loggerService, auditService},
        controllers: { authController, folderController, fileController, zipController },
        
    };
}

module.exports = { createContainer };