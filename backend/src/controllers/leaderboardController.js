const User = require('../models/User');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const Contest = require('../models/Contest');
const ContestSession = require('../models/ContestSession');
const { getIsConnected, inMemoryStore } = require('../config/db');

// Helper to format duration in seconds
const formatDuration = (totalSeconds) => {
  if (totalSeconds === undefined || totalSeconds === null || totalSeconds < 0 || isNaN(totalSeconds)) return 'N/A';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
};

// Helper to calculate problem time breakdown and total time taken
const calculateUserTimes = (questionDataMap, userStartTime = null) => {
  const problemTimes = [];
  let totalTimeSeconds = 0;
  const solvedTimestamps = [];

  for (const [qId, data] of Object.entries(questionDataMap)) {
    const isSolved = (data.score === 100 || data.verdict === 'Accepted' || data.score > 0);
    let seconds = null;

    if (isSolved && (data.firstAcceptedTime || data.bestSubTime)) {
      const solveTime = new Date(data.firstAcceptedTime || data.bestSubTime);
      solvedTimestamps.push(solveTime.getTime());

      if (userStartTime) {
        const elapsed = Math.max(0, Math.floor((solveTime.getTime() - new Date(userStartTime).getTime()) / 1000));
        seconds = Math.max(1, elapsed);
      } else if (data.firstAttempt) {
        const diff = Math.max(0, Math.floor((solveTime.getTime() - new Date(data.firstAttempt).getTime()) / 1000));
        seconds = diff > 0 ? diff : Math.max(15, Math.round((data.executionTime || 0.5) * 60));
      } else {
        seconds = Math.max(15, Math.round((data.executionTime || 0.5) * 60));
      }
    }

    problemTimes.push({
      qId,
      title: data.qTitle || 'Problem',
      score: data.score || 0,
      verdict: data.verdict || (isSolved ? 'Accepted' : 'Unattempted'),
      language: data.language || null,
      isSolved,
      seconds,
      formatted: seconds !== null ? formatDuration(seconds) : 'N/A'
    });
  }

  const solvedTimes = problemTimes.filter(pt => pt.isSolved);
  const problemTimesFormatted = solvedTimes.length > 0
    ? solvedTimes.map(pt => `${pt.title}: ${pt.formatted}`).join(' | ')
    : 'None';

  if (userStartTime && solvedTimestamps.length > 0) {
    const lastSolveMs = Math.max(...solvedTimestamps);
    totalTimeSeconds = Math.max(1, Math.floor((lastSolveMs - new Date(userStartTime).getTime()) / 1000));
  } else if (solvedTimes.length > 0) {
    totalTimeSeconds = solvedTimes.reduce((acc, pt) => acc + (pt.seconds || 0), 0);
  } else {
    totalTimeSeconds = 0;
  }

  const totalTimeFormatted = (solvedTimes.length > 0 || totalTimeSeconds > 0) ? formatDuration(totalTimeSeconds) : 'N/A';

  return {
    problemTimes,
    problemTimesFormatted,
    totalTimeSeconds,
    totalTimeFormatted
  };
};

const leaderboardCache = new Map();
const inFlightLeaderboards = new Map();
const LEADERBOARD_CACHE_TTL = 3000; // 3 seconds cache
let lastInvalidation = 0;

const adminAnalyticsCache = { data: null, timestamp: 0 };
const ADMIN_ANALYTICS_CACHE_TTL = 3000;

const invalidateLeaderboardCache = (contestId = null) => {
  const now = Date.now();
  adminAnalyticsCache.timestamp = 0;
  if (contestId) {
    leaderboardCache.delete(String(contestId));
  } else if (now - lastInvalidation > 1500) {
    leaderboardCache.delete('global');
    lastInvalidation = now;
  }
};

// Get Leaderboard rankings
const getLeaderboard = async (req, res) => {
  try {
    const { contestId } = req.query;
    const cacheKey = contestId ? String(contestId) : 'global';
    const cached = leaderboardCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < LEADERBOARD_CACHE_TTL)) {
      return res.json(cached.data);
    }

    if (inFlightLeaderboards.has(cacheKey)) {
      const data = await inFlightLeaderboards.get(cacheKey);
      return res.json(data);
    }

    const leaderboardPromise = (async () => {
      if (contestId && contestId !== 'global') {
        let contest;
        if (getIsConnected()) {
          contest = contestId.match(/^[0-9a-fA-F]{24}$/)
            ? await Contest.findById(contestId).populate('problems')
            : await Contest.findOne({ slug: contestId }).populate('problems');
        } else {
          contest = (inMemoryStore.contests || []).find(c => String(c._id) === String(contestId) || c.slug === String(contestId));
        }
        if (!contest) return { error: 404, message: 'Contest not found' };

        // Build allowed problems map for this specific contest
        const allowedProblemMap = {};
        const contestProblemPoints = {};
        (contest.problems || []).forEach((p, idx) => {
          if (typeof p === 'object' && p !== null) {
            const pTitle = p.title || `Problem ${idx + 1}`;
            const pts = p.points || (p.difficulty === 'Medium' ? 200 : (p.difficulty === 'Hard' ? 300 : 100));
            if (p._id) {
              const pid = String(p._id);
              allowedProblemMap[pid] = pTitle;
              contestProblemPoints[pid] = pts;
            }
            if (p.id) {
              const pid = String(p.id);
              allowedProblemMap[pid] = pTitle;
              contestProblemPoints[pid] = pts;
            }
            if (p.slug) {
              allowedProblemMap[p.slug] = pTitle;
              contestProblemPoints[p.slug] = pts;
            }
          } else if (p) {
            const pid = String(p);
            let pTitle = `Problem ${idx + 1}`;
            let pts = 100;
            if (!getIsConnected()) {
              const qObj = (inMemoryStore.questions || []).find(q => String(q._id) === pid || q.slug === pid);
              if (qObj) {
                pTitle = qObj.title;
                pts = qObj.points || (qObj.difficulty === 'Medium' ? 200 : (qObj.difficulty === 'Hard' ? 300 : 100));
              }
            }
            allowedProblemMap[pid] = pTitle;
            contestProblemPoints[pid] = pts;
          }
        });
        const hasSpecificProblems = Object.keys(allowedProblemMap).length > 0;

        let contestSessions = [];
        let relevantSubmissions = [];

        if (getIsConnected()) {
          contestSessions = await ContestSession.find({ contest: contest._id })
            .populate('user', 'name teamName email')
            .lean();
          relevantSubmissions = await Submission.find({
            contest: contest._id
          })
            .select('user question questionTitle score verdict language executionTime createdAt blurCount')
            .populate('user', 'name teamName email')
            .populate('question', 'title slug difficulty points')
            .sort({ createdAt: 1 })
            .lean();
        } else {
          contestSessions = (inMemoryStore.contestSessions || []).filter(s => String(s.contest) === String(contest._id));
          relevantSubmissions = (inMemoryStore.submissions || [])
            .filter(s => String(s.contest) === String(contest._id))
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        }

        const sessionMap = {};
        contestSessions.forEach(s => {
          const uId = String(s.user?._id || s.user);
          sessionMap[uId] = s;
        });

        const userScores = {};

        // Helper to seed problem template for a user
        const seedUserQuestionData = (uId) => {
          if (hasSpecificProblems) {
            // Seed uniquely by problem id/slug from contest.problems
            (contest.problems || []).forEach((p, idx) => {
              const key = typeof p === 'object' && p !== null ? String(p._id || p.id || p.slug) : String(p);
              const title = typeof p === 'object' && p !== null ? (p.title || `Problem ${idx + 1}`) : (allowedProblemMap[key] || `Problem ${idx + 1}`);
              if (!userScores[uId].questionData[key]) {
                userScores[uId].questionData[key] = {
                  firstAttempt: null,
                  bestSubTime: null,
                  firstAcceptedTime: null,
                  score: 0,
                  verdict: 'Unattempted',
                  language: null,
                  executionTime: 0,
                  qTitle: title
                };
              }
            });
          }
        };

        // Seed all participants who have started a contest session
        for (const session of contestSessions) {
          let u = session.user;
          const uId = String(u?._id || session.user);
          if (!getIsConnected() && (!u || !u.name)) {
            u = (inMemoryStore.users || []).find(user => String(user._id) === uId);
          }
          if (u && !userScores[uId]) {
            userScores[uId] = {
              id: uId,
              name: u.name || 'Participant',
              teamName: u.teamName || u.name || 'Team',
              email: u.email || '',
              sessionStartTime: session.startTime ? new Date(session.startTime) : null,
              sessionFinishedAt: session.finishedAt ? new Date(session.finishedAt) : null,
              questionData: {}
            };
            seedUserQuestionData(uId);
          }
        }

        for (const sub of relevantSubmissions) {
          const uId = String(sub.user?._id || sub.user);
          if (!userScores[uId]) {
            let userInfo = null;
            if (getIsConnected()) {
              userInfo = sub.user;
            } else {
              userInfo = (inMemoryStore.users || []).find(u => String(u._id) === String(uId));
            }
            if (!userInfo) continue;

            const userSession = sessionMap[uId];
            userScores[uId] = {
              id: uId,
              name: userInfo.name || 'Participant',
              teamName: userInfo.teamName || userInfo.name || 'Team',
              email: userInfo.email || '',
              sessionStartTime: userSession?.startTime ? new Date(userSession.startTime) : null,
              sessionFinishedAt: userSession?.finishedAt ? new Date(userSession.finishedAt) : null,
              questionData: {}
            };
            seedUserQuestionData(uId);
          }

          const qId = String(sub.question?._id || sub.question);
          const qSlug = sub.question?.slug;

          // If this contest has a specific problem set, ignore submissions for other unrelated questions
          if (hasSpecificProblems && !allowedProblemMap[qId] && (!qSlug || !allowedProblemMap[qSlug])) {
            continue;
          }

          let matchedKey = qId;
          if (hasSpecificProblems) {
            if (userScores[uId].questionData[qId]) {
              matchedKey = qId;
            } else if (qSlug && userScores[uId].questionData[qSlug]) {
              matchedKey = qSlug;
            } else {
              // Find matching key in allowedProblemMap
              const foundKey = Object.keys(userScores[uId].questionData).find(k => k === qId || k === qSlug);
              if (foundKey) matchedKey = foundKey;
            }
          }

          let qTitle = allowedProblemMap[qId] || (qSlug && allowedProblemMap[qSlug]) || sub.questionTitle || sub.question?.title || 'Problem';

          const subTime = new Date(sub.createdAt);
          let currentScore = sub.score || 0;
          const isAccepted = sub.verdict === 'Accepted';

          // Ensure max points align with contest problem weight if accepted
          if (isAccepted && contestProblemPoints[matchedKey]) {
            currentScore = Math.max(currentScore, contestProblemPoints[matchedKey]);
          }

          if (!userScores[uId].questionData[matchedKey] || userScores[uId].questionData[matchedKey].verdict === 'Unattempted') {
            userScores[uId].questionData[matchedKey] = {
              firstAttempt: subTime,
              bestSubTime: subTime,
              firstAcceptedTime: isAccepted ? subTime : null,
              score: currentScore,
              verdict: sub.verdict,
              language: sub.language || null,
              executionTime: sub.executionTime || 0,
              qTitle
            };
          } else {
            const qData = userScores[uId].questionData[matchedKey];
            if (!qData.firstAttempt) qData.firstAttempt = subTime;
            if (!qData.firstAcceptedTime && isAccepted) {
              qData.firstAcceptedTime = subTime;
            }
            if (currentScore > qData.score || (currentScore === qData.score && isAccepted && qData.verdict !== 'Accepted')) {
              qData.score = currentScore;
              qData.bestSubTime = subTime;
              qData.verdict = sub.verdict;
              qData.language = sub.language || qData.language;
              qData.executionTime = sub.executionTime || qData.executionTime || 0;
            }
          }
        }

        const students = Object.values(userScores).map(u => {
          let totalScore = 0;
          let solvedCount = 0;

          for (const qData of Object.values(u.questionData)) {
            totalScore += (qData.score || 0);
            if (qData.score === 100 || qData.verdict === 'Accepted') solvedCount++;
          }

          // Determine user reference start time for accurate contest elapsed duration
          let userStartTime = u.sessionStartTime;
          if (!userStartTime) {
            const allSubTimes = Object.values(u.questionData)
              .map(q => q.firstAttempt ? new Date(q.firstAttempt).getTime() : null)
              .filter(Boolean);
            if (allSubTimes.length > 0) {
              userStartTime = new Date(Math.min(...allSubTimes));
            } else {
              userStartTime = new Date(contest.startTime || contest.createdAt);
            }
          }

          const timeInfo = calculateUserTimes(u.questionData, userStartTime);

          // If participant finished contest session, use official session duration
          let finalTotalSecs = timeInfo.totalTimeSeconds;
          if (u.sessionFinishedAt && userStartTime) {
            finalTotalSecs = Math.max(0, Math.floor((new Date(u.sessionFinishedAt) - userStartTime) / 1000));
          }

          const finalTotalFormatted = (solvedCount > 0 || finalTotalSecs > 0) ? formatDuration(finalTotalSecs) : 'N/A';

          return {
            ...u,
            score: totalScore,
            solvedCount,
            problemTimes: timeInfo.problemTimes,
            problemTimesFormatted: timeInfo.problemTimesFormatted,
            totalTimeSeconds: finalTotalSecs,
            totalTimeFormatted: finalTotalFormatted
          };
        });

        students.sort((a, b) => b.score - a.score || b.solvedCount - a.solvedCount || a.totalTimeSeconds - b.totalTimeSeconds);

        const ranked = students.map((user, idx) => ({
          rank: idx + 1,
          id: user.id,
          name: user.name,
          teamName: user.teamName || user.name,
          email: user.email,
          score: user.score,
          solvedCount: user.solvedCount,
          problemTimes: user.problemTimes,
          problemTimesFormatted: user.problemTimesFormatted,
          totalTimeSeconds: user.totalTimeSeconds,
          totalTimeFormatted: user.totalTimeFormatted
        }));

        return { leaderboard: ranked };
      }

      // Global Leaderboard
      if (getIsConnected()) {
        const leaderboard = await User.find({ role: 'student' })
          .select('name teamName email score solvedCount createdAt')
          .sort({ score: -1, solvedCount: -1, createdAt: 1 })
          .limit(100)
          .lean();

        const studentIds = leaderboard.map(s => s._id);
        const allSubmissions = await Submission.find({ user: { $in: studentIds } })
          .select('user question questionTitle score verdict executionTime createdAt')
          .sort({ createdAt: 1 })
          .lean();

        const studentSubMap = {};
        for (const sub of allSubmissions) {
          const uId = String(sub.user);
          if (!studentSubMap[uId]) studentSubMap[uId] = {};
          const qId = String(sub.question?._id || sub.question);
          const qTitle = sub.questionTitle || 'Problem';
          const subTime = new Date(sub.createdAt);
          const currentScore = sub.score || 0;
          const isAccepted = sub.verdict === 'Accepted';

          if (!studentSubMap[uId][qId]) {
            studentSubMap[uId][qId] = {
              firstAttempt: subTime,
              bestSubTime: subTime,
              firstAcceptedTime: isAccepted ? subTime : null,
              score: currentScore,
              verdict: sub.verdict,
              executionTime: sub.executionTime || 0,
              qTitle
            };
          } else {
            const qData = studentSubMap[uId][qId];
            if (!qData.firstAcceptedTime && isAccepted) {
              qData.firstAcceptedTime = subTime;
            }
            if (currentScore > qData.score || (currentScore === qData.score && isAccepted && qData.verdict !== 'Accepted')) {
              qData.score = currentScore;
              qData.bestSubTime = subTime;
              qData.verdict = sub.verdict;
              qData.executionTime = sub.executionTime || qData.executionTime || 0;
            }
          }
        }

        const ranked = leaderboard.map((user, idx) => {
          const uId = String(user._id);
          const qMap = studentSubMap[uId] || {};
          const timeInfo = calculateUserTimes(qMap, null);

          return {
            rank: idx + 1,
            id: user._id,
            name: user.name,
            teamName: user.teamName || user.name,
            email: user.email,
            score: user.score || 0,
            solvedCount: user.solvedCount || 0,
            problemTimes: timeInfo.problemTimes,
            problemTimesFormatted: timeInfo.problemTimesFormatted,
            totalTimeSeconds: timeInfo.totalTimeSeconds,
            totalTimeFormatted: timeInfo.totalTimeFormatted
          };
        });

        return { leaderboard: ranked };
      } else {
        const students = (inMemoryStore.users || [])
          .filter(u => u.role === 'student')
          .sort((a, b) => (b.score || 0) - (a.score || 0) || (b.solvedCount || 0) - (a.solvedCount || 0));

        const ranked = students.map((user, idx) => {
          const uId = String(user._id);
          const userSubs = (inMemoryStore.submissions || [])
            .filter(s => String(s.user) === uId)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

          const qMap = {};
          for (const sub of userSubs) {
            const qId = String(sub.question);
            let qTitle = sub.questionTitle;
            if (!qTitle) {
              const qObj = (inMemoryStore.questions || []).find(q => String(q._id) === qId);
              if (qObj) qTitle = qObj.title;
            }
            if (!qTitle) qTitle = 'Problem';
            const subTime = new Date(sub.createdAt);
            const currentScore = sub.score || 0;
            const isAccepted = sub.verdict === 'Accepted';

            if (!qMap[qId]) {
              qMap[qId] = {
                firstAttempt: subTime,
                bestSubTime: subTime,
                firstAcceptedTime: isAccepted ? subTime : null,
                score: currentScore,
                verdict: sub.verdict,
                executionTime: sub.executionTime || 0,
                qTitle
              };
            } else {
              const qData = qMap[qId];
              if (!qData.firstAcceptedTime && isAccepted) {
                qData.firstAcceptedTime = subTime;
              }
              if (currentScore > qData.score || (currentScore === qData.score && isAccepted && qData.verdict !== 'Accepted')) {
                qData.score = currentScore;
                qData.bestSubTime = subTime;
                qData.verdict = sub.verdict;
                qData.executionTime = sub.executionTime || qData.executionTime || 0;
              }
            }
          }

          const timeInfo = calculateUserTimes(qMap, null);

          return {
            rank: idx + 1,
            id: user._id,
            name: user.name,
            teamName: user.teamName || user.name,
            email: user.email,
            score: user.score || 0,
            solvedCount: user.solvedCount || 0,
            problemTimes: timeInfo.problemTimes,
            problemTimesFormatted: timeInfo.problemTimesFormatted,
            totalTimeSeconds: timeInfo.totalTimeSeconds,
            totalTimeFormatted: timeInfo.totalTimeFormatted
          };
        });

        return { leaderboard: ranked };
      }
    })();

    inFlightLeaderboards.set(cacheKey, leaderboardPromise);
    const result = await leaderboardPromise;
    inFlightLeaderboards.delete(cacheKey);

    if (result && !result.error) {
      leaderboardCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return res.json(result);
    } else if (result && result.error) {
      return res.status(result.error).json({ message: result.message });
    }

    return res.json({ leaderboard: [] });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ message: 'Error retrieving leaderboard' });
  }
};

// Admin Analytics Overview — with 3s in-memory cache + parallel queries
const getAdminAnalytics = async (req, res) => {
  try {
    // Serve from cache if still fresh
    if (adminAnalyticsCache.data && (Date.now() - adminAnalyticsCache.timestamp < ADMIN_ANALYTICS_CACHE_TTL)) {
      return res.json(adminAnalyticsCache.data);
    }

    if (getIsConnected()) {
      // Run all DB queries in parallel instead of sequentially
      const [
        totalStudents,
        totalQuestions,
        totalSubmissions,
        acceptedSubmissions,
        recentSubmissions
      ] = await Promise.all([
        User.countDocuments({ role: 'student' }),
        Question.countDocuments(),
        Submission.countDocuments(),
        Submission.countDocuments({ verdict: 'Accepted' }),
        Submission.find({}, { verdict: 1, createdAt: 1, userName: 1, questionTitle: 1 })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
      ]);

      const passRate = totalSubmissions > 0
        ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
        : 0;

      const result = { totalStudents, totalQuestions, totalSubmissions, acceptedSubmissions, passRate, recentSubmissions };
      adminAnalyticsCache.data = result;
      adminAnalyticsCache.timestamp = Date.now();
      return res.json(result);
    } else {
      const totalStudents = inMemoryStore.users.filter(u => u.role === 'student').length;
      const totalQuestions = inMemoryStore.questions.length;
      const totalSubmissions = inMemoryStore.submissions.length;
      const acceptedSubmissions = inMemoryStore.submissions.filter(s => s.verdict === 'Accepted').length;
      const passRate = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;
      const recentSubmissions = [...inMemoryStore.submissions]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);

      const result = { totalStudents, totalQuestions, totalSubmissions, acceptedSubmissions, passRate, recentSubmissions };
      adminAnalyticsCache.data = result;
      adminAnalyticsCache.timestamp = Date.now();
      return res.json(result);
    }
  } catch (err) {
    console.error('Admin analytics error:', err);
    res.status(500).json({ message: 'Error fetching admin analytics' });
  }
};

// Individual Student Dashboard Stats
const getStudentStats = async (req, res) => {
  try {
    const userId = req.user.id;

    if (getIsConnected()) {
      const user = await User.findById(userId).select('-password').lean();
      if (!user) return res.status(404).json({ message: 'User not found' });

      const userSubmissions = await Submission.find({ user: userId })
        .select('question verdict score')
        .lean();
      const totalAttempted = userSubmissions.length;
      const totalAccepted = userSubmissions.filter(s => s.verdict === 'Accepted').length;

      // Group by difficulty
      const acceptedSubmissions = userSubmissions.filter(s => s.verdict === 'Accepted');
      const questionIds = [...new Set(acceptedSubmissions.map(s => String(s.question)))];
      const solvedQuestions = await Question.find({ _id: { $in: questionIds } })
        .select('difficulty')
        .lean();

      const easyCount = solvedQuestions.filter(q => q.difficulty === 'Easy').length;
      const mediumCount = solvedQuestions.filter(q => q.difficulty === 'Medium').length;
      const hardCount = solvedQuestions.filter(q => q.difficulty === 'Hard').length;

      return res.json({
        user,
        stats: {
          totalAttempted,
          totalAccepted,
          easyCount,
          mediumCount,
          hardCount
        }
      });
    } else {
      const user = inMemoryStore.users.find(u => String(u._id) === String(userId));
      if (!user) return res.status(404).json({ message: 'User not found' });

      const userSubmissions = inMemoryStore.submissions.filter(s => String(s.user) === String(userId));
      const totalAttempted = userSubmissions.length;
      const totalAccepted = userSubmissions.filter(s => s.verdict === 'Accepted').length;

      const acceptedSubmissions = userSubmissions.filter(s => s.verdict === 'Accepted');
      const questionIds = [...new Set(acceptedSubmissions.map(s => String(s.question)))];
      const solvedQuestions = inMemoryStore.questions.filter(q => questionIds.includes(String(q._id)));

      const easyCount = solvedQuestions.filter(q => q.difficulty === 'Easy').length;
      const mediumCount = solvedQuestions.filter(q => q.difficulty === 'Medium').length;
      const hardCount = solvedQuestions.filter(q => q.difficulty === 'Hard').length;

      const { password, ...userData } = user;

      return res.json({
        user: userData,
        stats: {
          totalAttempted,
          totalAccepted,
          easyCount,
          mediumCount,
          hardCount
        }
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error fetching student dashboard stats' });
  }
};

module.exports = {
  getLeaderboard,
  getAdminAnalytics,
  getStudentStats,
  invalidateLeaderboardCache
};
