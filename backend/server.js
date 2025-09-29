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

const buildAuthRoutes = require('./routes/authRoutes');
const buildFolderRoutes = require('./routes/folderRoutes');
const buildFileRoutes = require('./routes/fileRoutes');
const buildPublicRoutes = require('./routes/publicRoutes');
const buildRecentRoutes = require('./routes/recentRoutes');
const buildTrashRoutes = require('./routes/trashRoutes');

app.use('/api/auth', buildAuthRoutes({ authController: controllers.authController }));
app.use('/api/folders', buildFolderRoutes({ folderController: controllers.folderController, zipController: controllers.zipController }));
app.use('/api/files', buildFileRoutes({ fileController: controllers.fileController }));
app.use('/api/public', buildPublicRoutes({ fileController: controllers.fileController }));
app.use('/api/recent', buildRecentRoutes({ recentController: controllers.recentController }));
app.use('/api/trash', buildTrashRoutes({ trashController: controllers.trashController }));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));