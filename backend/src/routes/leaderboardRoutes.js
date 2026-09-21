const express = require('express');
const router = express.Router();
const {
  getLeaderboard,
  getAdminAnalytics,
  getStudentStats
} = require('../controllers/leaderboardController');
const { authMiddleware, adminOnlyMiddleware } = require('../middleware/auth');

router.get('/', getLeaderboard);
router.get('/rankings', getLeaderboard);
router.get('/admin-analytics', authMiddleware, adminOnlyMiddleware, getAdminAnalytics);
router.get('/student-stats', authMiddleware, getStudentStats);

module.exports = router;
