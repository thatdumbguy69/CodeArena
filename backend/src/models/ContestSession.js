const mongoose = require('mongoose');

const contestSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contest: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true },
  startTime: { type: Date, default: Date.now, required: true },
  isFinished: { type: Boolean, default: false },
  finishedAt: { type: Date },
  isDisqualified: { type: Boolean, default: false },
  disqualificationReason: { type: String, default: '' },
  blurCount: { type: Number, default: 0 },
  antiCheatLogs: [
    {
      event: { type: String, default: '' },
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

// Ensure a user only has one session per contest
contestSessionSchema.index({ user: 1, contest: 1 }, { unique: true });
contestSessionSchema.index({ contest: 1, isDisqualified: 1 });
contestSessionSchema.index({ startTime: -1 });

module.exports = mongoose.model('ContestSession', contestSessionSchema);
