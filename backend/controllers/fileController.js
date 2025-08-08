
const File = require('../models/File');
const Folder = require('../models/Folder');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

// GET /api/files/in-folder/:folderId
const listFilesInFolder = async (req, res) => {
    try {
        const folder = await Folder.findById(req.params.folderId);

        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        if (folder.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to view this folder' });
        }

        const files = await File.find({ folder: folder._id }).sort({ createdAt: -1 });

        res.status(200).json(files);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

const upload = multer({ storage: storage });

// POST /api/files/in-folder/:folderId
const uploadFile = async (req, res) => {
    try {
        const folder = await Folder.findById(req.params.folderId);
    
        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        if (folder.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to upload to this folder' });
        }

        const file = req.file;

        const newFile = await File.create({
            user: req.user.id,
            folder: folder._id,
            name: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            filePath: file.path,  
        });

        res.status(201).json(newFile);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/files/:fileId/download
const downloadFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.fileId);

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        if (file.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to download this file' });
        }

        const savedFilePath = path.join(__dirname, '..', 'uploads', file.filePath);
        
        if (!fs.existsSync(savedFilePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        res.download(savedFilePath, file.name);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { listFilesInFolder, uploadFile, upload, downloadFile };