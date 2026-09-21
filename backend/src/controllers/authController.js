const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');
const {
    getIsConnected,
    inMemoryStore,
    saveLocalUsersBackup,
    removeLocalUserBackup,
    removeAllLocalStudentsBackup
} = require('../config/db');

const { getIO } = require('../services/socketService');

// Register User
const register = async(req, res) => {
    try {
        const { name, teamName, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please fill in all required fields' });
        }

        const assignedRole = role === 'admin' ? 'admin' : 'student';
        const now = new Date();

        if (getIsConnected()) {
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(400).json({ message: 'User with this email already exists' });
            }

            const salt = await bcrypt.genSalt(8);
            const hashedPassword = await bcrypt.hash(password, salt);

            const user = await User.create({
                name,
                teamName: teamName || name,
                email: email.toLowerCase(),
                password: hashedPassword,
                role: assignedRole,
                score: 0,
                solvedCount: 0,
                createdAt: now,
                lastLogin: now
            });

            const userObj = { id: user._id, _id: user._id, name: user.name, teamName: user.teamName, email: user.email, role: user.role, score: user.score, solvedCount: user.solvedCount, createdAt: user.createdAt, lastLogin: user.lastLogin };
            saveLocalUsersBackup({ ...userObj, password: hashedPassword });

            // Real-time broadcast to admin dashboard & proctoring
            const io = getIO();
            if (io) {
                io.emit('user:registered', {
                    user: userObj
                });
            }

            bustUsersCache();
            const token = jwt.sign({ id: user._id, role: user.role, email: user.email, name: user.name, teamName: user.teamName }, JWT_SECRET, { expiresIn: '7d' });

            return res.status(201).json({
                user: userObj,
                token
            });
        } else {
            // Memory Store Fallback
            const existing = inMemoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (existing) {
                return res.status(400).json({ message: 'User with this email already exists' });
            }

            const salt = await bcrypt.genSalt(8);
            const hashedPassword = await bcrypt.hash(password, salt);

            const memUser = {
                _id: 'mem_user_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                name,
                teamName: teamName || name,
                email: email.toLowerCase(),
                password: hashedPassword,
                role: assignedRole,
                score: 0,
                solvedCount: 0,
                createdAt: now,
                lastLogin: now
            };
            inMemoryStore.users.push(memUser);
            saveLocalUsersBackup(memUser);

            const io = getIO();
            if (io) {
                io.emit('user:registered', {
                    user: { id: memUser._id, _id: memUser._id, name: memUser.name, teamName: memUser.teamName, email: memUser.email, role: memUser.role, score: memUser.score, solvedCount: memUser.solvedCount, createdAt: memUser.createdAt, lastLogin: memUser.lastLogin }
                });
            }

            const token = jwt.sign({ id: memUser._id, role: memUser.role, email: memUser.email, name: memUser.name, teamName: memUser.teamName }, JWT_SECRET, { expiresIn: '7d' });

            return res.status(201).json({
                user: { id: memUser._id, _id: memUser._id, name: memUser.name, teamName: memUser.teamName, email: memUser.email, role: memUser.role, score: memUser.score, solvedCount: memUser.solvedCount, createdAt: memUser.createdAt, lastLogin: memUser.lastLogin },
                token
            });
        }
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Server error during registration', error: err.message });
    }
};

// Short-lived memory cache for users list (busted on create/delete/register)
const usersListCache = { data: null, exp: 0 };
const bustUsersCache = () => { usersListCache.data = null; usersListCache.exp = 0; };

// Login User
const login = async(req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const now = new Date();

        if (getIsConnected()) {
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                return res.status(400).json({ message: 'Invalid credentials - user does not exist' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials - incorrect password' });
            }

            user.lastLogin = now;
            // Non-blocking asynchronous update to prevent 300ms remote database latency
            User.updateOne({ _id: user._id }, { $set: { lastLogin: now } }).catch(() => {});

            const io = getIO();
            if (io) {
                io.emit('user:login', {
                    user: { id: user._id, _id: user._id, name: user.name, teamName: user.teamName || user.name, email: user.email, role: user.role, score: user.score, solvedCount: user.solvedCount, lastLogin: user.lastLogin }
                });
            }

            const token = jwt.sign({ id: user._id, role: user.role, email: user.email, name: user.name, teamName: user.teamName }, JWT_SECRET, { expiresIn: '7d' });

            return res.json({
                user: { id: user._id, _id: user._id, name: user.name, teamName: user.teamName || user.name, email: user.email, role: user.role, score: user.score, solvedCount: user.solvedCount, createdAt: user.createdAt, lastLogin: user.lastLogin },
                token
            });
        } else {
            const memUser = inMemoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (!memUser) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            const isMatch = await bcrypt.compare(password, memUser.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            memUser.lastLogin = now;

            const io = getIO();
            if (io) {
                io.emit('user:login', {
                    user: { id: memUser._id, _id: memUser._id, name: memUser.name, teamName: memUser.teamName || memUser.name, email: memUser.email, role: memUser.role, score: memUser.score, solvedCount: memUser.solvedCount, lastLogin: memUser.lastLogin }
                });
            }

            const token = jwt.sign({ id: memUser._id, role: memUser.role, email: memUser.email, name: memUser.name, teamName: memUser.teamName }, JWT_SECRET, { expiresIn: '7d' });

            return res.json({
                user: { id: memUser._id, _id: memUser._id, name: memUser.name, teamName: memUser.teamName || memUser.name, email: memUser.email, role: memUser.role, score: memUser.score, solvedCount: memUser.solvedCount, createdAt: memUser.createdAt, lastLogin: memUser.lastLogin },
                token
            });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error during login', error: err.message });
    }
};

// Get Current User Profile
const getMe = async(req, res) => {
    try {
        if (getIsConnected()) {
            const user = await User.findById(req.user.id).select('-password');
            if (!user) return res.status(404).json({ message: 'User not found' });
            return res.json({ user });
        } else {
            const memUser = inMemoryStore.users.find(u => String(u._id) === String(req.user.id));
            if (!memUser) return res.status(404).json({ message: 'User not found' });
            const { password, ...userData } = memUser;
            return res.json({ user: userData });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error fetching user profile' });
    }
};

// Get All Users (Admin Only)
const getAllUsers = async (req, res) => {
    try {
        if (usersListCache.data && Date.now() < usersListCache.exp) {
            return res.json({ users: usersListCache.data });
        }

        if (getIsConnected()) {
            const users = await User.find({}, { name: 1, teamName: 1, email: 1, role: 1, score: 1, solvedCount: 1, createdAt: 1, lastLogin: 1 })
                .sort({ createdAt: -1 })
                .lean();
            usersListCache.data = users;
            usersListCache.exp = Date.now() + 3000; // 3s fast cache
            return res.json({ users });
        } else {
            const users = (inMemoryStore.users || []).map(({ password, ...u }) => u);
            usersListCache.data = users;
            usersListCache.exp = Date.now() + 3000;
            return res.json({ users });
        }
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Error retrieving user list' });
    }
};

// Create User (Admin Direct Provisioning)
const createUser = async (req, res) => {
    try {
        const { name, teamName, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required.' });
        }

        const assignedRole = role === 'admin' ? 'admin' : 'student';
        const now = new Date();

        if (getIsConnected()) {
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(400).json({ message: 'User with this email already exists' });
            }

            const salt = await bcrypt.genSalt(8);
            const hashedPassword = await bcrypt.hash(password, salt);

            const user = await User.create({
                name,
                teamName: teamName || name,
                email: email.toLowerCase(),
                password: hashedPassword,
                role: assignedRole,
                score: 0,
                solvedCount: 0,
                createdAt: now,
                lastLogin: null
            });

            const userObj = {
                id: user._id,
                _id: user._id,
                name: user.name,
                teamName: user.teamName,
                email: user.email,
                role: user.role,
                score: user.score,
                solvedCount: user.solvedCount,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            };

            saveLocalUsersBackup({ ...userObj, password: hashedPassword });

            bustUsersCache();
            const io = getIO();
            if (io) {
                io.emit('user:registered', { user: userObj });
            }

            return res.status(201).json({
                message: `User "${user.name}" created successfully.`,
                user: userObj
            });
        } else {
            const existing = inMemoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (existing) {
                return res.status(400).json({ message: 'User with this email already exists' });
            }

            const salt = await bcrypt.genSalt(8);
            const hashedPassword = await bcrypt.hash(password, salt);

            const memUser = {
                _id: 'mem_user_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                name,
                teamName: teamName || name,
                email: email.toLowerCase(),
                password: hashedPassword,
                role: assignedRole,
                score: 0,
                solvedCount: 0,
                createdAt: now,
                lastLogin: null
            };
            inMemoryStore.users.push(memUser);
            saveLocalUsersBackup(memUser);

            const { password: _, ...userObj } = memUser;
            userObj.id = userObj._id;

            bustUsersCache();
            const io = getIO();
            if (io) {
                io.emit('user:registered', { user: userObj });
            }

            return res.status(201).json({
                message: `User "${memUser.name}" created successfully.`,
                user: userObj
            });
        }
    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ message: 'Error creating user account', error: err.message });
    }
};

// Delete User (Admin Only) — cascades submissions, contest sessions, leaderboard entries
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (String(id) === String(req.user.id)) {
            return res.status(400).json({ message: 'You cannot delete your own admin account while logged in.' });
        }

        bustUsersCache();
        // Always remove from local backup
        removeLocalUserBackup(id);

        if (getIsConnected()) {
            const Submission = require('../models/Submission');
            const ContestSession = require('../models/ContestSession');
            const Contest = require('../models/Contest');

            const deleted = await User.findByIdAndDelete(id);
            if (!deleted) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Cascade — delete all related data in parallel
            await Promise.all([
                Submission.deleteMany({ user: id }),
                ContestSession.deleteMany({ user: id }),
                Contest.updateMany(
                    { registeredStudents: id },
                    { $pull: { registeredStudents: id } }
                )
            ]);

            // Notify admin UI in real-time
            const io = getIO();
            if (io) {
                io.emit('user:deleted', { userId: id });
            }

            return res.json({
                message: `User "${deleted.name}" and all related data removed successfully.`
            });
        } else {
            if (!inMemoryStore.users) inMemoryStore.users = [];
            const initialLength = inMemoryStore.users.length;
            const userToDelete = inMemoryStore.users.find(u => String(u._id) === id);
            inMemoryStore.users = inMemoryStore.users.filter(u => String(u._id) !== id);

            if (inMemoryStore.users.length === initialLength) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Cascade — remove submissions by this user
            if (inMemoryStore.submissions) {
                inMemoryStore.submissions = inMemoryStore.submissions.filter(
                    s => String(s.user) !== id
                );
            }

            // Cascade — remove contest sessions by this user
            if (inMemoryStore.contestSessions) {
                inMemoryStore.contestSessions = inMemoryStore.contestSessions.filter(
                    s => String(s.user) !== id
                );
            }

            // Cascade — pull user from all contest registeredStudents lists
            if (inMemoryStore.contests) {
                inMemoryStore.contests = inMemoryStore.contests.map(c => ({
                    ...c,
                    registeredStudents: (c.registeredStudents || []).filter(
                        sid => String(sid) !== id
                    )
                }));
            }

            // Notify admin UI in real-time
            const io = getIO();
            if (io) {
                io.emit('user:deleted', { userId: id });
            }

            return res.json({
                message: `User "${userToDelete?.name || id}" and all related data removed successfully.`
            });
        }
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ message: 'Error removing user', error: err.message });
    }
};

// Delete ALL Students (Admin Only) — cascades submissions, sessions, registrations
const deleteAllStudents = async (req, res) => {
    try {
        bustUsersCache();
        // Clean from local backup
        removeAllLocalStudentsBackup();

        if (getIsConnected()) {
            const Submission = require('../models/Submission');
            const ContestSession = require('../models/ContestSession');
            const Contest = require('../models/Contest');

            // Find all student IDs first
            const students = await User.find({ role: { $ne: 'admin' } }, { _id: 1 });
            const studentIds = students.map(s => s._id);

            // Cascade-delete all related data in parallel
            const [result] = await Promise.all([
                User.deleteMany({ role: { $ne: 'admin' } }),
                Submission.deleteMany({ user: { $in: studentIds } }),
                ContestSession.deleteMany({ user: { $in: studentIds } }),
                Contest.updateMany(
                    {},
                    { $pull: { registeredStudents: { $in: studentIds } } }
                )
            ]);

            const io = getIO();
            if (io) {
                io.emit('users:bulk_deleted', { count: result.deletedCount });
            }

            return res.json({
                message: `Removed ${result.deletedCount} student account(s) and all related data successfully.`,
                deletedCount: result.deletedCount
            });
        } else {
            if (!inMemoryStore.users) inMemoryStore.users = [];

            // Collect student IDs
            const studentIds = new Set(
                inMemoryStore.users
                    .filter(u => u.role !== 'admin')
                    .map(u => String(u._id))
            );
            const before = inMemoryStore.users.length;

            // Remove students
            inMemoryStore.users = inMemoryStore.users.filter(u => u.role === 'admin');
            const deletedCount = before - inMemoryStore.users.length;

            // Cascade — submissions
            if (inMemoryStore.submissions) {
                inMemoryStore.submissions = inMemoryStore.submissions.filter(
                    s => !studentIds.has(String(s.user))
                );
            }

            // Cascade — contest sessions
            if (inMemoryStore.contestSessions) {
                inMemoryStore.contestSessions = inMemoryStore.contestSessions.filter(
                    s => !studentIds.has(String(s.user))
                );
            }

            // Cascade — pull from contest registrations
            if (inMemoryStore.contests) {
                inMemoryStore.contests = inMemoryStore.contests.map(c => ({
                    ...c,
                    registeredStudents: (c.registeredStudents || []).filter(
                        sid => !studentIds.has(String(sid))
                    )
                }));
            }

            const io = getIO();
            if (io) {
                io.emit('users:bulk_deleted', { count: deletedCount });
            }

            return res.json({
                message: `Removed ${deletedCount} student account(s) and all related data successfully.`,
                deletedCount
            });
        }
    } catch (err) {
        console.error('Delete all students error:', err);
        res.status(500).json({ message: 'Error removing student accounts', error: err.message });
    }
};

module.exports = {
    register,
    login,
    getMe,
    getAllUsers,
    createUser,
    deleteUser,
    deleteAllStudents
};