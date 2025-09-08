const path = require('path');

const { AuthController } = require('../controllers/AuthController');
const { FolderController } = require('../controllers/FolderController');
const { FileController } = require('../controllers/FileController');
const { ZipController } = require('../controllers/ZipController');

const UserService = require('../services/UserService');
const FolderService = require('../services/FolderService');
const FileService = require('../services/FileService');
const ZipService = require('../services/ZipService');

const LocalStorage = require('../services/storage/LocalStorage');

const hasher = require('./hasher');
const tokenUtil = require('./tokenUtil');

function createContainer() {
    const storage = new LocalStorage({
        baseDir: path.resolve(__dirname, '..', 'uploads'),
    });

    const userService = new UserService({ hasher, tokenUtil });
    const folderService = new FolderService();
    const fileService = new FileService({ storage });
    const zipService = new ZipService({ fileService, folderService });

    const authController = new AuthController({ userService });
    const folderController = new FolderController({ folderService });
    const fileController = new FileController({ fileService });    
    const zipController = new ZipController({ zipService });

    return {
        services: { userService, folderService, fileService, zipService },
        controllers: { authController, folderController, fileController, zipController },
    };
}

module.exports = { createContainer };