const express = require('express');
const router = express.Router();
const { register, login, getMe, getAllUsers, createUser, deleteUser, deleteAllStudents, resetUserPassword } = require('../controllers/authController');
const { authMiddleware, adminOnlyMiddleware } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.get('/users', authMiddleware, adminOnlyMiddleware, getAllUsers);
router.post('/users', authMiddleware, adminOnlyMiddleware, createUser);
router.post('/users/:id/reset-password', authMiddleware, adminOnlyMiddleware, resetUserPassword);
router.delete('/users/all-students', authMiddleware, adminOnlyMiddleware, deleteAllStudents);
router.delete('/users/:id', authMiddleware, adminOnlyMiddleware, deleteUser);

module.exports = router;

