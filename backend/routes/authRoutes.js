const express = require('express');
const { protect } = require('../middleware/authMiddleware');

module.exports = ({ authController }) => {
    const router = express.Router();

    router.post('/register', authController.register.bind(authController));
    router.post('/login', authController.login.bind(authController));
    router.get('/profile', protect, authController.profile.bind(authController));
    router.put('/profile', protect, authController.updateProfile.bind(authController));

    return router;
};