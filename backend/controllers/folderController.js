
const Folder = require('../models/Folder');

// GET /api/folders
const getFolders = async (req, res) => {
    try {
        const folders = await Folder.find({ user: req.user.id }).sort({ createdAt: -1 });

        const formattedFolders = folders.map((folder) => ({
            id: folder._id,
            name: folder.name,
            user: folder.user,
            createdAt: folder.createdAt,
        }));
        res.status(200).json(formattedFolders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/folders
const createFolder = async (req, res) => {
  const { name } = req.body;

    try {
        if (!name) {
            return res.status(400).json({ message: 'Folder name is required' });
        }

        const folder = await Folder.create({
            name,
            user: req.user.id,
        });

        res.status(201).json({
            id: folder._id,
            name: folder.name,
            user: folder.user,
            createdAt: folder.createdAt,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PUT /api/folders/:id
const updateFolder = async (req, res) => {
  const { name } = req.body;

    try {
        if (!name) {
            return res.status(400).json({ message: 'Folder name is required' });
        }

        const folder = await Folder.findById(req.params.id);

        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        if (folder.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this folder' });
        }

        folder.name = name;
        const updatedFolder = await folder.save();

        res.status(200).json({
            id: updatedFolder._id,
            name: updatedFolder.name,
            user: updatedFolder.user,
            createdAt: updatedFolder.createdAt,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getFolders, createFolder, updateFolder };