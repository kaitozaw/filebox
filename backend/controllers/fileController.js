
const File = require('../models/File');
const Folder = require('../models/Folder');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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

        const savedFilePath = path.isAbsolute(file.filePath)? file.filePath : path.join(__dirname, '..', file.filePath);
        
        if (!fs.existsSync(savedFilePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        res.download(savedFilePath, file.name);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
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
            filePath: path.join('uploads', path.basename(file.path)),  
        });

        res.status(201).json(newFile);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/files/:fileId/share
const generatePublicUrl = async (req, res) => {
    try {
        const file = await File.findById(req.params.fileId);
        
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        if (file.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to share this file' });
        }

        file.publicId = uuidv4();
        file.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await file.save();

        const publicUrl = `${process.env.REACT_APP_API_BASE_URL}/public/${file.publicId}`;
        res.status(200).json({ publicUrl });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PUT /api/files/:fileId
const renameFile = async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'New file name is required' });
        }

        const file = await File.findById(req.params.fileId);
        
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        if (file.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to rename this file' });
        }

        file.name = name;
        const updated = await file.save();

        res.status(200).json({
            id: updated._id,
            name: updated.name,
            size: updated.size,
            mimetype: updated.mimetype,
            createdAt: updated.createdAt,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE /api/files/:fileId
const deleteFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.fileId);
        
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        if (file.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this file' });
        }

        const savedFilePath = path.join(__dirname, '..', 'uploads', file.filePath);

        if (fs.existsSync(savedFilePath)) {
            fs.unlinkSync(savedFilePath);
        }

        await file.deleteOne();

        res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/public//:publicId
const accessPublicFile = async (req, res) => {
    try {
        const file = await File.findOne({ publicId: req.params.publicId });

        if (!file) {
            return res.status(404).json({ message: 'Shared file not found' });
        }
        
        if (file.expiresAt && new Date() > file.expiresAt) {
            return res.status(410).json({ message: 'This link has expired.' });
        }

        const savedFilePath = path.isAbsolute(file.filePath)? file.filePath : path.join(__dirname, '..', file.filePath);

        if (!fs.existsSync(savedFilePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        res.download(savedFilePath, file.name);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { listFilesInFolder, downloadFile, upload, uploadFile, generatePublicUrl, renameFile, deleteFile, accessPublicFile };