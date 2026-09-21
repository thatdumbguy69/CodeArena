const express = require('express');
const router = express.Router();
const {
  getAllQuestions,
  getQuestionByIdOrSlug,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  restoreDefaultQuestions
} = require('../controllers/questionController');
const { authMiddleware, optionalAuthMiddleware, adminOnlyMiddleware } = require('../middleware/auth');

router.get('/', optionalAuthMiddleware, getAllQuestions);
router.post('/restore-defaults', authMiddleware, adminOnlyMiddleware, restoreDefaultQuestions);
router.get('/:id', optionalAuthMiddleware, getQuestionByIdOrSlug);
router.post('/', authMiddleware, adminOnlyMiddleware, createQuestion);
router.put('/:id', authMiddleware, adminOnlyMiddleware, updateQuestion);
router.delete('/:id', authMiddleware, adminOnlyMiddleware, deleteQuestion);

module.exports = router;
