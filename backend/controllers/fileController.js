
const File = require('../models/File');
const Folder = require('../models/Folder');

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

module.exports = { listFilesInFolder };