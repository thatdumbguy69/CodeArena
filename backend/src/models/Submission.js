const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  questionTitle: { type: String, required: true },
  language: { type: String, required: true },
  code: { type: String, required: true },
  verdict: {
    type: String,
    enum: ['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Compile Error', 'Runtime Error', 'Pending'],
    default: 'Pending'
  },
  score: { type: Number, default: 0 },
  testCasesPassed: { type: Number, default: 0 },
  totalTestCases: { type: Number, default: 0 },
  executionTime: { type: Number, default: 0 }, // in seconds
  memoryUsed: { type: Number, default: 0 }, // in KB
  details: [
    {
      testCaseIndex: Number,
      isHidden: Boolean,
      status: String,
      input: String,
      expectedOutput: String,
      actualOutput: String,
      executionTime: Number,
      memory: Number,
      stdout: String,
      stderr: String
    }
  ],
  antiCheatLogs: [
    {
      event: String,
      timestamp: { type: Date, default: Date.now }
    }
  ],
  contest: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: false },
  blurCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

submissionSchema.index({ contest: 1, createdAt: -1 });
submissionSchema.index({ user: 1, createdAt: -1 });
submissionSchema.index({ user: 1, question: 1, score: -1 });
submissionSchema.index({ question: 1 });
submissionSchema.index({ verdict: 1 });
submissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);
