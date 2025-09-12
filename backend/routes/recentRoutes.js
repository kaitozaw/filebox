const express = require('express');
const { protect } = require('../middleware/authMiddleware');

module.exports = ({ recentController }) => {
  const router = express.Router();

  router.get('/recent', protect, recentController.getRecent.bind(recentController));

  return router;
};