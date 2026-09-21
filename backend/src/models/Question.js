const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, default: false },
  explanation: { type: String, default: '' },
  marks: { type: Number, default: 10 },
  timeLimitOverride: { type: Number }, // Optional time limit override in seconds
  memoryLimitOverride: { type: Number } // Optional memory limit override in MB
});

const questionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, required: true },
  inputFormat: { type: String, default: '' },
  outputFormat: { type: String, default: '' },
  constraints: { type: String, default: '' },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
  category: { type: String, default: 'Algorithms' },
  points: { type: Number, default: 100 },
  isPublic: { type: Boolean, default: true },
  tags: [{ type: String }],
  allowedLanguages: [{ type: String, default: ['c', 'cpp', 'java', 'python', 'javascript'] }],
  timeLimit: { type: Number, default: 2.0 }, // in seconds
  memoryLimit: { type: Number, default: 256 }, // in MB
  sampleInput: { type: String, default: '' },
  sampleOutput: { type: String, default: '' },
  starterCode: {
    c: { type: String, default: '' },
    cpp: { type: String, default: '' },
    java: { type: String, default: '' },
    python: { type: String, default: '' },
    javascript: { type: String, default: '' }
  },
  referenceSolution: {
    c: { type: String, default: '' },
    cpp: { type: String, default: '' },
    java: { type: String, default: '' },
    python: { type: String, default: '' },
    javascript: { type: String, default: '' }
  },
  testCases: [testCaseSchema],
  submissionsCount: { type: Number, default: 0 },
  acceptedCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

questionSchema.index({ isPublic: 1, createdAt: -1 });
questionSchema.index({ difficulty: 1 });
questionSchema.index({ category: 1 });
questionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Question', questionSchema);
