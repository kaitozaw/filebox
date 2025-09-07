const { AuthController } = require('../controllers/AuthController');
const { FolderController } = require('../controllers/FolderController');
const { FileController } = require('../controllers/FileController');

const UserService = require('../services/UserService');
const FolderService = require('../services/FolderService');
const FileService = require('../services/FileService');

const hasher = require('./hasher');
const tokenUtil = require('./tokenUtil');

function createContainer() {
    const userService = new UserService({ hasher, tokenUtil });
    const folderService = new FolderService();
    const fileService = new FileService();

    const authController = new AuthController({ userService });
    const folderController = new FolderController({ folderService });
    const fileController = new FileController({ fileService });

    return {
        services: { userService, folderService, fileService },
        controllers: { authController, folderController, fileController },
    };
}

module.exports = { createContainer };