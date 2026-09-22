const mongoose = require('mongoose');

const contestSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, default: '' },
  startTime: { type: Date, default: Date.now },
  duration: { type: Number, default: 60 }, // in minutes
  endTime: { type: Date },
  status: { type: String, enum: ['Upcoming', 'Active', 'Ended'], default: 'Active' },
  problems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  registeredStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  antiCheatEnabled: { type: Boolean, default: true },
  maxAllowedBlurs: { type: Number, default: 2 },
  autoDisqualify: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

contestSchema.index({ status: 1 });
contestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Contest', contestSchema);
