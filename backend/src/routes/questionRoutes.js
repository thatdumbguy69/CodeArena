const express = require('express');
const router = express.Router();
const {
  getAllQuestions,
  getQuestionByIdOrSlug,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  restoreDefaultQuestions,
  exportQuestions,
  importQuestions
} = require('../controllers/questionController');
const { authMiddleware, optionalAuthMiddleware, adminOnlyMiddleware } = require('../middleware/auth');

router.get('/', optionalAuthMiddleware, getAllQuestions);
router.post('/export', authMiddleware, adminOnlyMiddleware, exportQuestions);
router.post('/import', authMiddleware, adminOnlyMiddleware, importQuestions);
router.post('/restore-defaults', authMiddleware, adminOnlyMiddleware, restoreDefaultQuestions);
router.get('/:id', optionalAuthMiddleware, getQuestionByIdOrSlug);
router.post('/', authMiddleware, adminOnlyMiddleware, createQuestion);
router.put('/:id', authMiddleware, adminOnlyMiddleware, updateQuestion);
router.delete('/:id', authMiddleware, adminOnlyMiddleware, deleteQuestion);

module.exports = router;
