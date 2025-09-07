const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { createContainer } = require('./utils/factory');

const app = express();
app.use(express.json());
app.use(cors());
connectDB();
const container = createContainer();
const { controllers } = container;

const buildAuthRoutes = require('./routes/AuthRoutes');
const buildFolderRoutes = require('./routes/FolderRoutes');
const buildFileRoutes = require('./routes/FileRoutes');
const buildPublicRoutes = require('./routes/PublicRoutes');

app.use('/api/auth', buildAuthRoutes({ authController: controllers.authController }));
app.use('/api/folders', buildFolderRoutes({ folderController: controllers.folderController }));
app.use('/api/files', buildFileRoutes({ fileController: controllers.fileController }));
app.use('/api/public', buildPublicRoutes({ fileController: controllers.fileController }));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));