const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  teamName: {
    type: String,
    default: '',
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  score: {
    type: Number,
    default: 0
  },
  solvedCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'user data',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ role: 1, score: -1, solvedCount: -1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema, 'user data');
