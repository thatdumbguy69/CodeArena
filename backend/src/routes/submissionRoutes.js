const express = require('express');
const router = express.Router();
const {
  runCode,
  submitCode,
  getUserSubmissions,
  getSubmissionById,
  deleteAllSubmissions,
  deleteSubmission
} = require('../controllers/submissionController');
const { authMiddleware, adminOnlyMiddleware } = require('../middleware/auth');

router.post('/run', authMiddleware, runCode);
router.post('/submit', authMiddleware, submitCode);
router.get('/', authMiddleware, getUserSubmissions);
router.delete('/all', authMiddleware, adminOnlyMiddleware, deleteAllSubmissions);
router.get('/:id', authMiddleware, getSubmissionById);
router.delete('/:id', authMiddleware, adminOnlyMiddleware, deleteSubmission);

module.exports = router;
