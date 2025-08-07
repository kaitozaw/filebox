
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

module.exports = { getFolders, createFolder };