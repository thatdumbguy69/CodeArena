const express = require('express');
const router = express.Router();
const {
  getAllContests,
  getContestByIdOrSlug,
  createContest,
  updateContest,
  deleteContest,
  startContestSession,
  finishContestSession,
  getContestAnalytics,
  disqualifyParticipant,
  qualifyParticipant,
  logAntiCheatEvent,
  getAllProctoringSummary,
  clearProctoringData
} = require('../controllers/contestController');
const { authMiddleware, adminOnlyMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

router.get('/', optionalAuthMiddleware, getAllContests);
router.get('/proctoring/summary', authMiddleware, adminOnlyMiddleware, getAllProctoringSummary);
router.delete('/proctoring/clear-all', authMiddleware, adminOnlyMiddleware, clearProctoringData);
router.get('/:id/analytics', authMiddleware, adminOnlyMiddleware, getContestAnalytics);
router.post('/:id/disqualify', authMiddleware, adminOnlyMiddleware, disqualifyParticipant);
router.post('/:id/qualify', authMiddleware, adminOnlyMiddleware, qualifyParticipant);
router.get('/:id', optionalAuthMiddleware, getContestByIdOrSlug);
router.post('/', authMiddleware, adminOnlyMiddleware, createContest);
router.put('/:id', authMiddleware, adminOnlyMiddleware, updateContest);
router.delete('/:id', authMiddleware, adminOnlyMiddleware, deleteContest);

router.post('/:id/session/start', authMiddleware, startContestSession);
router.post('/:id/session/finish', authMiddleware, finishContestSession);
router.post('/:id/session/event', authMiddleware, logAntiCheatEvent);

module.exports = router;
