const Submission = require('../models/Submission');
const Question = require('../models/Question');
const User = require('../models/User');
const Contest = require('../models/Contest');
const { executeCodeWithJudge0, normalizeOutput } = require('../services/judge0Service');
const { getIsConnected, inMemoryStore } = require('../config/db');

const findQuestionByIdOrSlug = async (questionId) => {
  if (!questionId) return null;
  const qStr = typeof questionId === 'object' ? String(questionId._id || questionId.id || questionId.slug || '') : String(questionId);
  if (!qStr) return null;

  try {
    if (getIsConnected()) {
      if (qStr.match(/^[0-9a-fA-F]{24}$/)) {
        const q = await Question.findById(qStr);
        if (q) return q;
      }
      return await Question.findOne({ slug: qStr });
    } else {
      const list = inMemoryStore.questions || [];
      return list.find(q => String(q._id) === qStr || q.slug === qStr || String(q.id) === qStr);
    }
  } catch (err) {
    console.error('findQuestionByIdOrSlug error:', err);
    return null;
  }
};

// Run Code (Dry run against sample visible test cases)
const runCode = async (req, res) => {
  try {
    const { questionId, language, code, customInput } = req.body;
    if (!language || !code) {
      return res.status(400).json({ message: 'Language and code are required' });
    }

    const question = await findQuestionByIdOrSlug(questionId);

    if (!question && !customInput) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // If user passed custom input directly
    if (customInput !== undefined && customInput !== null) {
      const result = await executeCodeWithJudge0(language, code, customInput);
      return res.json({
        customExecution: true,
        input: customInput,
        stdout: result.stdout,
        stderr: result.stderr,
        status: result.status,
        executionTime: result.time,
        memory: result.memory
      });
    }

    // Run against sample visible test cases
    const visibleTestCases = (question.testCases || []).filter(tc => !tc.isHidden);
    const testResults = [];

    for (let i = 0; i < visibleTestCases.length; i++) {
      const tc = visibleTestCases[i];
      const execRes = await executeCodeWithJudge0(language, code, tc.input);

      const normalizedActual = normalizeOutput(execRes.stdout);
      const normalizedExpected = normalizeOutput(tc.expectedOutput);

      let status = execRes.status;
      if (status === 'Accepted' || status === 'OK') {
        if (normalizedActual === normalizedExpected) {
          status = 'Passed';
        } else {
          status = 'Wrong Answer';
        }
      }

      testResults.push({
        testCaseIndex: i + 1,
        isHidden: false,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: execRes.stdout,
        status: status,
        stdout: execRes.stdout,
        stderr: execRes.stderr,
        executionTime: execRes.time
      });

      // Short-circuit remaining test cases if code failed compilation
      if (status === 'Compile Error') {
        for (let j = i + 1; j < visibleTestCases.length; j++) {
          testResults.push({
            testCaseIndex: j + 1,
            isHidden: false,
            input: visibleTestCases[j].input,
            expectedOutput: visibleTestCases[j].expectedOutput,
            actualOutput: '',
            status: 'Compile Error',
            stdout: '',
            stderr: execRes.stderr,
            executionTime: 0
          });
        }
        break;
      }
    }

    // Extract compilation or runtime error diagnostics if any
    let compileError = null;
    let anyStderr = null;
    let hasCompileError = false;

    for (const tr of testResults) {
      if (tr.status === 'Compile Error') {
        hasCompileError = true;
        compileError = tr.stderr;
        break;
      } else if (tr.stderr && tr.stderr.trim().length > 0) {
        anyStderr = anyStderr || tr.stderr;
      }
    }

    return res.json({
      runSuccess: !hasCompileError,
      status: hasCompileError ? 'Compile Error' : 'Evaluated',
      compileError: compileError || (hasCompileError ? anyStderr : null),
      stderr: compileError || anyStderr,
      testResults
    });
  } catch (err) {
    console.error('Run code error:', err);
    res.status(500).json({ message: 'Error executing code', error: err.message });
  }
};

// Submit Code (Formal submission evaluated against ALL test cases)
const submitCode = async (req, res) => {
  try {
    const { questionId, language, code, antiCheatLogs, contestId, blurCount } = req.body;
    const userId = req.user.id;
    const userName = req.user.name;

    if (!questionId || !language || !code) {
      return res.status(400).json({ message: 'Question ID, language, and code are required' });
    }

    const question = await findQuestionByIdOrSlug(questionId);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (contestId && req.user?.role !== 'admin') {
      const Contest = require('../models/Contest');
      let contestDoc;
      if (getIsConnected()) {
        if (String(contestId).match(/^[0-9a-fA-F]{24}$/)) {
          contestDoc = await Contest.findById(contestId);
        } else {
          contestDoc = await Contest.findOne({ slug: contestId });
        }
      } else {
        contestDoc = (inMemoryStore.contests || []).find(c => String(c._id) === String(contestId) || c.slug === String(contestId));
      }
      if (contestDoc && contestDoc.startTime) {
        const start = new Date(contestDoc.startTime);
        if (new Date() < start) {
          return res.status(403).json({ message: 'Contest has not started yet. Submissions are rejected until start time.' });
        }
      }
    }

    const allTestCases = question.testCases || [];
    if (allTestCases.length === 0) {
      return res.status(400).json({ message: 'Question has no test cases configured' });
    }

    const testResults = [];

    for (let i = 0; i < allTestCases.length; i++) {
      const tc = allTestCases[i];
      const tcMarks = tc.marks !== undefined ? tc.marks : 10;
      const execRes = await executeCodeWithJudge0(language, code, tc.input);

      const normalizedActual = normalizeOutput(execRes.stdout);
      const normalizedExpected = normalizeOutput(tc.expectedOutput);

      let tcStatus = execRes.status;
      let isPassed = false;

      if (tcStatus === 'Accepted' || tcStatus === 'OK') {
        if (normalizedActual === normalizedExpected) {
          tcStatus = 'Passed';
          isPassed = true;
        } else {
          tcStatus = 'Wrong Answer';
        }
      }

      testResults.push({
        testCaseIndex: i + 1,
        isHidden: tc.isHidden || false,
        status: tcStatus,
        isPassed,
        marks: tcMarks,
        execRes,
        input: tc.isHidden ? '[Hidden Test Case]' : tc.input,
        expectedOutput: tc.isHidden ? '[Hidden Expected Output]' : tc.expectedOutput,
        actualOutput: tc.isHidden ? (tcStatus === 'Passed' ? '[Matches Expected]' : '[Mismatch]') : execRes.stdout,
        stdout: execRes.stdout,
        stderr: execRes.stderr,
        executionTime: execRes.time
      });

      // Short-circuit remaining test cases if code failed compilation
      if (tcStatus === 'Compile Error') {
        for (let j = i + 1; j < allTestCases.length; j++) {
          const remTc = allTestCases[j];
          testResults.push({
            testCaseIndex: j + 1,
            isHidden: remTc.isHidden || false,
            status: 'Compile Error',
            isPassed: false,
            marks: remTc.marks !== undefined ? remTc.marks : 10,
            execRes,
            input: remTc.isHidden ? '[Hidden Test Case]' : remTc.input,
            expectedOutput: remTc.isHidden ? '[Hidden Expected Output]' : remTc.expectedOutput,
            actualOutput: '[Compile Error]',
            stdout: '',
            stderr: execRes.stderr,
            executionTime: 0
          });
        }
        break;
      }
    }

    let passedCount = 0;
    let earnedMarks = 0;
    let totalMarks = 0;
    let maxTime = 0;
    let maxMemory = 0;
    let overallVerdict = 'Accepted';
    const testDetails = [];

    for (let i = 0; i < testResults.length; i++) {
      const tr = testResults[i];
      totalMarks += tr.marks;
      maxTime = Math.max(maxTime, tr.execRes.time || 0);
      maxMemory = Math.max(maxMemory, tr.execRes.memory || 0);

      if (tr.isPassed) {
        passedCount++;
        earnedMarks += tr.marks;
      } else {
        if (tr.status === 'Wrong Answer') {
          if (overallVerdict === 'Accepted') overallVerdict = 'Wrong Answer';
        } else if (tr.status.includes('Time Limit')) {
          if (overallVerdict === 'Accepted' || overallVerdict === 'Wrong Answer') {
            overallVerdict = 'Time Limit Exceeded';
          }
        } else if (tr.status.includes('Compile Error')) {
          overallVerdict = 'Compile Error';
        } else {
          if (overallVerdict === 'Accepted' || overallVerdict === 'Wrong Answer') {
            overallVerdict = 'Runtime Error';
          }
        }
      }

      const { execRes, isPassed, ...detail } = tr;
      testDetails.push(detail);
    }

    // Score is calibrated to the earned test case marks
    const maxQuestionPoints = question.points !== undefined && question.points !== null && !isNaN(Number(question.points)) && Number(question.points) > 0
      ? Number(question.points)
      : (totalMarks > 0 ? totalMarks : 100);

    let calculatedScore = 0;
    if (overallVerdict === 'Accepted' || passedCount === allTestCases.length) {
      calculatedScore = Math.max(maxQuestionPoints, totalMarks);
    } else if (passedCount > 0) {
      calculatedScore = earnedMarks;
    } else {
      calculatedScore = 0;
    }

    let resolvedContestId = null;
    if (contestId) {
      if (typeof contestId === 'string' && contestId.match(/^[0-9a-fA-F]{24}$/)) {
        resolvedContestId = contestId;
      } else {
        const Contest = require('../models/Contest');
        if (getIsConnected()) {
          const c = await Contest.findOne({ slug: contestId });
          if (c) resolvedContestId = c._id;
        } else {
          const c = (inMemoryStore.contests || []).find(cnt => cnt.slug === contestId || String(cnt._id) === String(contestId));
          if (c) resolvedContestId = c._id;
        }
      }
    }

    let newSubmission;

    if (getIsConnected()) {
      newSubmission = await Submission.create({
        user: userId,
        userName,
        question: question._id,
        questionTitle: question.title,
        language,
        code,
        verdict: overallVerdict,
        score: calculatedScore,
        testCasesPassed: passedCount,
        totalTestCases: allTestCases.length,
        executionTime: maxTime,
        memoryUsed: maxMemory,
        details: testDetails,
        antiCheatLogs: antiCheatLogs || [],
        contest: resolvedContestId || null,
        blurCount: blurCount || 0
      });

      // Update question stats
      await Question.findByIdAndUpdate(question._id, {
        $inc: {
          submissionsCount: 1,
          acceptedCount: overallVerdict === 'Accepted' ? 1 : 0
        }
      });

      // Update user overall score for partial scoring (max score per problem)
      const userSubmissions = await Submission.find({ user: userId, question: question._id }).sort({ score: -1 });
      const maxPreviousScore = userSubmissions.length > 1 ? userSubmissions[1].score : 0;
      const pointsDiff = calculatedScore - maxPreviousScore;
      
      if (pointsDiff > 0) {
        await User.findByIdAndUpdate(userId, {
          $inc: { score: pointsDiff, solvedCount: overallVerdict === 'Accepted' && userSubmissions.length === 1 ? 1 : 0 }
        });
      }

    } else { // In-memory store logic
      newSubmission = {
        _id: 'mem_sub_' + Date.now() + '_' + Math.floor(Math.random()*1000),
        user: userId,
        userName,
        question: question._id,
        questionTitle: question.title,
        language,
        code,
        verdict: overallVerdict,
        score: calculatedScore,
        testCasesPassed: passedCount,
        totalTestCases: allTestCases.length,
        executionTime: maxTime,
        memoryUsed: maxMemory,
        details: testDetails,
        antiCheatLogs: antiCheatLogs || [],
        contest: contestId || null,
        blurCount: blurCount || 0,
        createdAt: new Date()
      };

      inMemoryStore.submissions.push(newSubmission);

      // Update question in memory
      question.submissionsCount = (question.submissionsCount || 0) + 1;
      if (overallVerdict === 'Accepted') {
        question.acceptedCount = (question.acceptedCount || 0) + 1;

        const user = inMemoryStore.users.find(u => String(u._id) === String(userId));
        if (user) {
          const userAccepted = inMemoryStore.submissions.filter(s => String(s.user) === String(userId) && String(s.question) === String(question._id) && s.verdict === 'Accepted');
          if (userAccepted.length === 1) {
            const pointMap = { Easy: 100, Medium: 200, Hard: 300 };
            user.score = (user.score || 0) + (pointMap[question.difficulty] || 100);
            user.solvedCount = (user.solvedCount || 0) + 1;
          }
        }
      }
    }

    let firstStderr = null;
    for (const tr of testResults) {
      if (tr.stderr) {
        firstStderr = tr.stderr;
        break;
      }
    }

    // Broadcast real-time leaderboard update via WebSockets
    try {
      const socketService = require('../services/socketService');
      socketService.emitLeaderboardUpdate(resolvedContestId || contestId);
    } catch (sockErr) {
      console.warn('Socket leaderboard broadcast error:', sockErr);
    }

    return res.status(201).json({
      message: 'Submission evaluated',
      submission: newSubmission,
      compileError: overallVerdict === 'Compile Error' ? firstStderr : null,
      stderr: firstStderr
    });
  } catch (err) {
    console.error('Submit code error:', err);
    res.status(500).json({ message: 'Error evaluating submission', error: err.message });
  }
};

// Get Submissions for current user, specific problem, or contest
const getUserSubmissions = async (req, res) => {
  try {
    const { questionId, contestId } = req.query;
    const userId = req.user.id;

    if (getIsConnected()) {
      let filter = {};
      if (req.user.role !== 'admin') {
        filter.user = userId;
      }
      if (questionId) {
        const qObj = await findQuestionByIdOrSlug(questionId);
        filter.question = qObj ? qObj._id : questionId;
      }
      if (contestId) {
        let cId = contestId;
        if (!contestId.match(/^[0-9a-fA-F]{24}$/)) {
          const cDoc = await Contest.findOne({ slug: contestId }).select('_id').lean();
          if (cDoc) cId = cDoc._id;
        }
        filter.contest = cId;
      }

      const submissions = await Submission.find(filter)
        .select('-code -details -antiCheatLogs')
        .populate('user', 'name teamName email')
        .populate('question', 'title difficulty points')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      return res.json({ submissions });
    } else {
      let filterSubmissions = [...inMemoryStore.submissions];
      if (req.user.role !== 'admin') {
        filterSubmissions = filterSubmissions.filter(s => String(s.user) === String(userId));
      }
      if (questionId) {
        filterSubmissions = filterSubmissions.filter(s => String(s.question) === String(questionId));
      }
      if (contestId) {
        filterSubmissions = filterSubmissions.filter(s => String(s.contest) === String(contestId));
      }

      filterSubmissions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ submissions: filterSubmissions.slice(0, 100) });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving submissions' });
  }
};

// Get single submission by ID
const getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (getIsConnected()) {
      const submission = await Submission.findById(id)
        .populate('user', 'name teamName email')
        .populate('question', 'title difficulty points')
        .lean();
      if (!submission) return res.status(404).json({ message: 'Submission not found' });
      return res.json({ submission });
    } else {
      const submission = inMemoryStore.submissions.find(s => String(s._id) === id);
      if (!submission) return res.status(404).json({ message: 'Submission not found' });
      return res.json({ submission });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving submission detail' });
  }
};

// Delete ALL Submissions (Admin Only)
const deleteAllSubmissions = async (req, res) => {
  try {
    const Question = require('../models/Question');
    const User = require('../models/User');

    if (getIsConnected()) {
      const result = await Submission.deleteMany({});

      // Reset question submissions and accepted counters
      await Question.updateMany({}, { $set: { submissionsCount: 0, acceptedCount: 0 } }).catch(() => {});

      // Reset student scores and solved count
      await User.updateMany({ role: { $ne: 'admin' } }, { $set: { score: 0, solvedCount: 0 } }).catch(() => {});

      try {
        const { getIO } = require('../services/socketService');
        const io = getIO();
        if (io) {
          io.emit('submissions:purged', { count: result.deletedCount });
        }
      } catch (sockErr) {}

      return res.json({
        message: `Successfully deleted all ${result.deletedCount} submissions.`,
        deletedCount: result.deletedCount
      });
    } else {
      const count = (inMemoryStore.submissions || []).length;
      inMemoryStore.submissions = [];

      (inMemoryStore.questions || []).forEach(q => {
        q.submissionsCount = 0;
        q.acceptedCount = 0;
      });

      (inMemoryStore.users || []).forEach(u => {
        if (u.role !== 'admin') {
          u.score = 0;
          u.solvedCount = 0;
        }
      });

      try {
        const { getIO } = require('../services/socketService');
        const io = getIO();
        if (io) {
          io.emit('submissions:purged', { count });
        }
      } catch (sockErr) {}

      return res.json({
        message: `Successfully deleted all ${count} submissions.`,
        deletedCount: count
      });
    }
  } catch (err) {
    console.error('Delete all submissions error:', err);
    res.status(500).json({ message: 'Error deleting all submissions', error: err.message });
  }
};

// Delete Single Submission (Admin Only)
const deleteSubmission = async (req, res) => {
  try {
    const { id } = req.params;

    if (getIsConnected()) {
      const deleted = await Submission.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ message: 'Submission not found' });
      return res.json({ message: 'Submission removed successfully', id });
    } else {
      const initialLength = (inMemoryStore.submissions || []).length;
      inMemoryStore.submissions = (inMemoryStore.submissions || []).filter(
        s => String(s._id) !== String(id) && String(s.id) !== String(id)
      );
      if (inMemoryStore.submissions.length === initialLength) {
        return res.status(404).json({ message: 'Submission not found' });
      }
      return res.json({ message: 'Submission removed successfully', id });
    }
  } catch (err) {
    console.error('Delete submission error:', err);
    res.status(500).json({ message: 'Error removing submission', error: err.message });
  }
};

module.exports = {
  runCode,
  submitCode,
  getUserSubmissions,
  getSubmissionById,
  deleteAllSubmissions,
  deleteSubmission
};
