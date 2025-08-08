
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', required: true },
    name: { type: String, required: true },
    size: { type: Number, required: true },
    mimetype: { type: String },
    filePath: { type: String },
    publicId: { type: String, unique: true, sparse: true },
    expiresAt: { type: Date },
    s3Key: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', fileSchema);