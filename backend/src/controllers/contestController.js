const Contest = require('../models/Contest');
const Question = require('../models/Question');
const ContestSession = require('../models/ContestSession');
const SystemSetting = require('../models/SystemSetting');
const { getIsConnected, inMemoryStore } = require('../config/db');
const { emitTimerSync, emitContestEnded } = require('../services/socketService');

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

const computeContestRealtime = (contestDoc) => {
  if (!contestDoc) return null;
  const c = contestDoc.toObject ? contestDoc.toObject() : { ...contestDoc };
  const now = new Date();
  
  const start = c.startTime ? new Date(c.startTime) : new Date(c.createdAt || now);
  const durationMins = c.duration || 60;
  const end = c.endTime ? new Date(c.endTime) : new Date(start.getTime() + durationMins * 60000);

  c.startTime = start;
  c.endTime = end;
  c.duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));

  let computedStatus = c.status;
  if (c.status === 'Ended' || now >= end) {
    computedStatus = 'Ended';
    c.remainingSecs = 0;
  } else if (now < start) {
    computedStatus = 'Upcoming';
    c.remainingSecs = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
  } else {
    computedStatus = 'Active';
    c.remainingSecs = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
  }

  c.status = computedStatus;
  c.startsInSecs = Math.max(0, Math.floor((start.getTime() - now.getTime()) / 1000));

  return c;
};

// Short-lived cache for the contests list (5s TTL, busted on mutations)
const contestsListCache = { data: null, exp: 0 };
const bustContestsCache = () => { contestsListCache.data = null; contestsListCache.exp = 0; };

// Get All Contests (Students & Admins)
const getAllContests = async (req, res) => {
  try {
    if (getIsConnected()) {
      // Serve from cache when fresh
      if (contestsListCache.data && Date.now() < contestsListCache.exp) {
        return res.json({ contests: contestsListCache.data });
      }
      const contests = await Contest.find()
        .populate('problems', 'title difficulty category points slug')
        .sort({ createdAt: -1 })
        .lean();
      const computed = contests.map(c => computeContestRealtime(c));
      contestsListCache.data = computed;
      contestsListCache.exp = Date.now() + 5000; // 5s TTL
      return res.json({ contests: computed });
    } else {
      const contests = inMemoryStore.contests || [];
      const computed = contests.map(c => computeContestRealtime(c));
      return res.json({ contests: computed });
    }
  } catch (err) {
    console.error('Fetch contests error:', err);
    res.status(500).json({ message: 'Error retrieving contests' });
  }
};

const buildContestParticipants = (contest, sessions, submissions) => {
  const participantsMap = {};

  (sessions || []).forEach(session => {
    const u = session.user || {};
    const userId = String(u._id || session.user);
    const startMs = session.startTime ? new Date(session.startTime).getTime() : Date.now();
    const endMs = session.finishedAt ? new Date(session.finishedAt).getTime() : Date.now();
    const totalSecs = Math.max(0, Math.floor((endMs - startMs) / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const blurs = session.blurCount || session.tabBlurCount || 0;

    participantsMap[userId] = {
      _id: userId,
      userId,
      name: u.name || 'Student',
      teamName: u.teamName || u.name || 'Team',
      email: u.email || 'N/A',
      startTime: session.startTime,
      finishedAt: session.finishedAt || null,
      timeTakenSecs: totalSecs,
      timeTakenFormatted: session.isFinished ? `${mins}m ${secs}s` : 'In Progress',
      isFinished: session.isFinished || false,
      isDisqualified: session.isDisqualified || false,
      disqualificationReason: session.disqualificationReason || '',
      tabBlurCount: blurs,
      blurCount: blurs,
      maxAllowedBlurs: contest.maxAllowedBlurs || 3,
      antiCheatLogs: session.antiCheatLogs || [],
      score: 0,
      solvedCount: 0,
      solvedQuestions: new Set(),
      totalSubmissionsCount: 0
    };
  });

  (submissions || []).forEach(sub => {
    const userId = String(sub.user?._id || sub.user);
    if (participantsMap[userId]) {
      participantsMap[userId].totalSubmissionsCount += 1;
      if (sub.blurCount && sub.blurCount > participantsMap[userId].tabBlurCount) {
        participantsMap[userId].tabBlurCount = sub.blurCount;
        participantsMap[userId].blurCount = sub.blurCount;
      }
      if (sub.verdict === 'Accepted') {
        const qId = String(sub.question?._id || sub.question);
        participantsMap[userId].solvedQuestions.add(qId);
      }
    }
  });

  Object.values(participantsMap).forEach(p => {
    let totalScore = 0;
    p.solvedQuestions.forEach(qId => {
      let points = 100;
      if (contest.problems) {
        const q = contest.problems.find(prob => String(prob._id || prob.slug || prob) === qId);
        if (q) {
          if (q.difficulty === 'Medium') points = 200;
          if (q.difficulty === 'Hard') points = 300;
          if (q.points) points = q.points;
        }
      }
      totalScore += points;
    });
    p.score = p.isDisqualified ? 0 : totalScore;
    p.solvedCount = p.solvedQuestions.size;
    delete p.solvedQuestions;
  });

  return Object.values(participantsMap);
};

// Get Single Contest details by ID or Slug
const getContestByIdOrSlug = async (req, res) => {
  try {
    const { id } = req.params;
    let contest;

    if (getIsConnected()) {
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        contest = await Contest.findById(id).populate('problems');
      } else {
        contest = await Contest.findOne({ slug: id }).populate('problems');
      }
      if (!contest) return res.status(404).json({ message: 'Contest not found' });
      const computed = computeContestRealtime(contest);
      if (computed && computed.status === 'Upcoming' && (!req.user || req.user.role !== 'admin')) {
        computed.problems = [];
      }

      // Populate real participant records for admin view
      if (req.user && req.user.role === 'admin') {
        const sessions = await ContestSession.find({ contest: contest._id })
          .populate('user', 'name teamName email')
          .lean();
        const Submission = require('../models/Submission');
        const submissions = await Submission.find({ contest: contest._id })
          .select('user question verdict score blurCount')
          .lean();
        computed.participants = buildContestParticipants(contest, sessions, submissions);
      }

      return res.json({ contest: computed });
    } else {
      const list = inMemoryStore.contests || [];
      contest = list.find(c => String(c._id) === id || c.slug === id);
      if (!contest) return res.status(404).json({ message: 'Contest not found' });
      const computed = computeContestRealtime(contest);
      if (computed && computed.status === 'Upcoming' && (!req.user || req.user.role !== 'admin')) {
        computed.problems = [];
      }

      if (req.user && req.user.role === 'admin') {
        const sessions = (inMemoryStore.contestSessions || []).filter(s => String(s.contest) === String(contest._id));
        const populatedSessions = sessions.map(s => {
          const u = (inMemoryStore.users || []).find(user => String(user._id) === String(s.user));
          return {
            ...s,
            user: u ? { _id: u._id, name: u.name, teamName: u.teamName || u.name, email: u.email } : { _id: s.user, name: 'Student', teamName: 'Team', email: 'N/A' }
          };
        });
        const submissions = (inMemoryStore.submissions || []).filter(s => String(s.contest) === String(contest._id));
        computed.participants = buildContestParticipants(contest, populatedSessions, submissions);
      }

      return res.json({ contest: computed });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error fetching contest detail' });
  }
};

// Host New Contest (Admin Only - Super Easy)
const createContest = async (req, res) => {
  try {
    const { title, description, duration, problemIds, antiCheatEnabled, startTime, endTime, maxAllowedBlurs, autoDisqualify } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Contest title is required' });
    }

    let effectiveMaxBlurs = maxAllowedBlurs !== undefined ? Math.max(1, parseInt(maxAllowedBlurs, 10) || 3) : undefined;
    let effectiveAutoDisq = autoDisqualify !== undefined ? Boolean(autoDisqualify) : undefined;

    if (effectiveMaxBlurs === undefined || effectiveAutoDisq === undefined) {
      try {
        if (getIsConnected()) {
          const sysSetting = await SystemSetting.findOne({ key: 'global_platform_settings' });
          if (sysSetting) {
            if (effectiveMaxBlurs === undefined) effectiveMaxBlurs = sysSetting.maxAllowedBlurs || 3;
            if (effectiveAutoDisq === undefined) effectiveAutoDisq = sysSetting.autoDisqualify !== false;
          }
        } else if (inMemoryStore.settings) {
          if (effectiveMaxBlurs === undefined) effectiveMaxBlurs = inMemoryStore.settings.maxAllowedBlurs || 3;
          if (effectiveAutoDisq === undefined) effectiveAutoDisq = inMemoryStore.settings.autoDisqualify !== false;
        }
      } catch (e) {}
    }
    if (effectiveMaxBlurs === undefined) effectiveMaxBlurs = 3;
    if (effectiveAutoDisq === undefined) effectiveAutoDisq = true;

    const slug = slugify(title) + '-' + Math.floor(Math.random()*1000);
    const start = startTime ? new Date(startTime) : new Date();
    let durationMins = parseInt(duration, 10) || 60;
    let end;
    if (endTime) {
      end = new Date(endTime);
      durationMins = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
    } else {
      end = new Date(start.getTime() + durationMins * 60000);
    }

    const now = new Date();
    let initialStatus = 'Active';
    if (now < start) initialStatus = 'Upcoming';
    else if (now >= end) initialStatus = 'Ended';

    if (getIsConnected()) {
      const contest = await Contest.create({
        title,
        slug,
        description: description || '',
        duration: durationMins,
        startTime: start,
        endTime: end,
        status: initialStatus,
        problems: problemIds || [],
        antiCheatEnabled: antiCheatEnabled !== undefined ? antiCheatEnabled : true,
        maxAllowedBlurs: effectiveMaxBlurs,
        autoDisqualify: effectiveAutoDisq,
        createdBy: req.user.id
      });
      const populated = await Contest.findById(contest._id).populate('problems');
      return res.status(201).json({ message: 'Contest hosted successfully', contest: computeContestRealtime(populated) });
    } else {
      // In-Memory store
      if (!inMemoryStore.contests) inMemoryStore.contests = [];

      const selectedProblems = (inMemoryStore.questions || []).filter(q =>
        (problemIds || []).includes(String(q._id)) || (problemIds || []).includes(q.slug)
      );

      const memContest = {
        _id: 'mem_contest_' + Date.now(),
        title,
        slug,
        description: description || '',
        duration: durationMins,
        startTime: start,
        endTime: end,
        status: initialStatus,
        problems: selectedProblems.length > 0 ? selectedProblems : (inMemoryStore.questions || []),
        registeredStudents: [],
        antiCheatEnabled: antiCheatEnabled !== undefined ? antiCheatEnabled : true,
        maxAllowedBlurs: effectiveMaxBlurs,
        autoDisqualify: effectiveAutoDisq,
        createdBy: req.user.id,
        createdAt: new Date()
      };

      inMemoryStore.contests.push(memContest);
      bustContestsCache();
      return res.status(201).json({ message: 'Contest hosted successfully', contest: computeContestRealtime(memContest) });
    }
  } catch (err) {
    console.error('Create contest error:', err);
    res.status(500).json({ message: 'Error hosting contest', error: err.message });
  }
};

// Update Contest (Admin Only)
const updateContest = async (req, res) => {
  try {
    const { id } = req.params;
    const { timeAdjustmentMins, startTime, duration, endTime, ...otherFields } = req.body;

    if (otherFields.maxAllowedBlurs !== undefined) {
      otherFields.maxAllowedBlurs = Math.max(1, parseInt(otherFields.maxAllowedBlurs, 10) || 3);
    }
    if (otherFields.autoDisqualify !== undefined) {
      otherFields.autoDisqualify = Boolean(otherFields.autoDisqualify);
    }

    if (getIsConnected()) {
      let contest = await Contest.findById(id);
      if (!contest) return res.status(404).json({ message: 'Contest not found' });

      const currentStart = startTime ? new Date(startTime) : (contest.startTime || new Date());
      contest.startTime = currentStart;

      if (otherFields.status === 'Ended' || otherFields.remainingSecs === 0) {
        const now = new Date();
        contest.endTime = now;
        contest.status = 'Ended';
        contest.duration = Math.max(1, Math.round((now.getTime() - currentStart.getTime()) / 60000));
      } else if (timeAdjustmentMins !== undefined) {
        const currentEnd = contest.endTime ? new Date(contest.endTime) : new Date(currentStart.getTime() + (contest.duration || 60) * 60000);
        const newEnd = new Date(currentEnd.getTime() + parseInt(timeAdjustmentMins, 10) * 60000);
        contest.endTime = newEnd;
        contest.duration = Math.max(1, Math.round((newEnd.getTime() - currentStart.getTime()) / 60000));
      } else if (endTime) {
        contest.endTime = new Date(endTime);
        contest.duration = Math.max(1, Math.round((contest.endTime.getTime() - currentStart.getTime()) / 60000));
      } else if (duration) {
        contest.duration = parseInt(duration, 10);
        contest.endTime = new Date(currentStart.getTime() + contest.duration * 60000);
      }

      Object.assign(contest, otherFields);

      // Re-evaluate status
      const now = new Date();
      if (contest.status !== 'Ended') {
        if (now < contest.startTime) contest.status = 'Upcoming';
        else if (now >= contest.endTime) contest.status = 'Ended';
        else contest.status = 'Active';
      }

      await contest.save();
      bustContestsCache();
      const populated = await Contest.findById(contest._id).populate('problems');
      const realtimeContest = computeContestRealtime(populated);

      if (realtimeContest.status === 'Ended' || otherFields.status === 'Ended') {
        emitContestEnded(contest._id);
        emitContestEnded(contest.slug);
      } else if (duration !== undefined || endTime !== undefined || timeAdjustmentMins !== undefined) {
        const remSecs = Math.max(0, Math.floor((new Date(realtimeContest.endTime).getTime() - Date.now()) / 1000));
        emitTimerSync(contest._id, remSecs, timeAdjustmentMins ? parseInt(timeAdjustmentMins, 10) : 0);
        emitTimerSync(contest.slug, remSecs, timeAdjustmentMins ? parseInt(timeAdjustmentMins, 10) : 0);
      }

      return res.json({ message: 'Contest updated successfully', contest: realtimeContest });
    } else {
      const list = inMemoryStore.contests || [];
      const idx = list.findIndex(c => String(c._id) === id || c.slug === id);
      if (idx === -1) return res.status(404).json({ message: 'Contest not found' });

      let c = list[idx];
      const currentStart = startTime ? new Date(startTime) : (c.startTime || new Date());
      c.startTime = currentStart;

      if (otherFields.status === 'Ended' || otherFields.remainingSecs === 0) {
        const now = new Date();
        c.endTime = now;
        c.status = 'Ended';
        c.duration = Math.max(1, Math.round((now.getTime() - currentStart.getTime()) / 60000));
      } else if (timeAdjustmentMins !== undefined) {
        const currentEnd = c.endTime ? new Date(c.endTime) : new Date(currentStart.getTime() + (c.duration || 60) * 60000);
        const newEnd = new Date(currentEnd.getTime() + parseInt(timeAdjustmentMins, 10) * 60000);
        c.endTime = newEnd;
        c.duration = Math.max(1, Math.round((newEnd.getTime() - currentStart.getTime()) / 60000));
      } else if (endTime) {
        c.endTime = new Date(endTime);
        c.duration = Math.max(1, Math.round((c.endTime.getTime() - currentStart.getTime()) / 60000));
      } else if (duration) {
        c.duration = parseInt(duration, 10);
        c.endTime = new Date(currentStart.getTime() + c.duration * 60000);
      }

      Object.assign(c, otherFields);

      const now = new Date();
      if (c.status !== 'Ended') {
        if (now < c.startTime) c.status = 'Upcoming';
        else if (now >= c.endTime) c.status = 'Ended';
        else c.status = 'Active';
      }

      list[idx] = computeContestRealtime(c);
      bustContestsCache();

      if (list[idx].status === 'Ended' || otherFields.status === 'Ended') {
        emitContestEnded(list[idx]._id);
        emitContestEnded(list[idx].slug);
      } else if (duration !== undefined || endTime !== undefined || timeAdjustmentMins !== undefined) {
        const remSecs = Math.max(0, Math.floor((new Date(list[idx].endTime).getTime() - Date.now()) / 1000));
        emitTimerSync(list[idx]._id, remSecs, timeAdjustmentMins ? parseInt(timeAdjustmentMins, 10) : 0);
        emitTimerSync(list[idx].slug, remSecs, timeAdjustmentMins ? parseInt(timeAdjustmentMins, 10) : 0);
      }

      return res.json({ message: 'Contest updated successfully', contest: list[idx] });
    }
  } catch (err) {
    console.error('Update contest error:', err);
    res.status(500).json({ message: 'Error updating contest' });
  }
};

// Delete Contest (Admin Only)
const deleteContest = async (req, res) => {
  try {
    const { id } = req.params;
    if (getIsConnected()) {
      let deleted;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        deleted = await Contest.findByIdAndDelete(id);
      } else {
        deleted = await Contest.findOneAndDelete({ slug: id });
      }

      if (deleted) {
        await ContestSession.deleteMany({ contest: deleted._id }).catch(() => {});
      } else {
        await ContestSession.deleteMany({ contest: id }).catch(() => {});
      }

      bustContestsCache();
      return res.json({ message: 'Contest deleted successfully' });
    } else {
      if (inMemoryStore.contests) {
        inMemoryStore.contests = inMemoryStore.contests.filter(c => String(c._id) !== String(id) && c.slug !== id && String(c.id) !== String(id));
      }
      if (inMemoryStore.contestSessions) {
        inMemoryStore.contestSessions = inMemoryStore.contestSessions.filter(s => String(s.contest) !== String(id));
      }
      bustContestsCache();
      return res.json({ message: 'Contest deleted successfully' });
    }
  } catch (err) {
    console.error('Delete contest error:', err);
    res.status(500).json({ message: 'Error deleting contest', error: err.message });
  }
};

// Start Contest Session
const startContestSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (getIsConnected()) {
      let contest;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        contest = await Contest.findById(id);
      } else {
        contest = await Contest.findOne({ slug: id });
      }

      if (!contest) return res.status(404).json({ message: 'Contest not found' });

      const computed = computeContestRealtime(contest);
      if (computed.status === 'Upcoming' && req.user?.role !== 'admin') {
        return res.status(403).json({
          message: `This contest has not started yet. Entry is permitted only once the contest starts at ${new Date(computed.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          isUpcoming: true,
          startTime: computed.startTime,
          startsInSecs: computed.startsInSecs
        });
      }

      let session = await ContestSession.findOne({ user: userId, contest: contest._id });

      if (session && session.isDisqualified) {
        return res.status(403).json({
          message: 'You have been disqualified from this contest. Only an administrator can reinstate your qualification.',
          isDisqualified: true,
          disqualificationReason: session.disqualificationReason || 'Exceeded maximum allowed window focus / fullscreen violations'
        });
      }

      if (!session) {
        session = await ContestSession.create({
          user: userId,
          contest: contest._id,
          startTime: new Date(),
          isFinished: false
        });
      }

      return res.json({ session });
    } else {
      const contest = inMemoryStore.contests.find(c => String(c._id) === id || c.slug === id);
      if (!contest) return res.status(404).json({ message: 'Contest not found' });

      const computed = computeContestRealtime(contest);
      if (computed.status === 'Upcoming' && req.user?.role !== 'admin') {
        return res.status(403).json({
          message: `This contest has not started yet. Entry is permitted only once the contest starts at ${new Date(computed.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          isUpcoming: true,
          startTime: computed.startTime,
          startsInSecs: computed.startsInSecs
        });
      }

      if (!inMemoryStore.contestSessions) inMemoryStore.contestSessions = [];

      let session = inMemoryStore.contestSessions.find(s => String(s.user) === String(userId) && String(s.contest) === String(contest._id));

      if (session && session.isDisqualified) {
        return res.status(403).json({
          message: 'You have been disqualified from this contest. Only an administrator can reinstate your qualification.',
          isDisqualified: true,
          disqualificationReason: session.disqualificationReason || 'Exceeded maximum allowed window focus / fullscreen violations'
        });
      }

      if (!session) {
        session = {
          _id: 'mem_sess_' + Date.now(),
          user: userId,
          contest: contest._id,
          startTime: new Date(),
          isFinished: false
        };
        inMemoryStore.contestSessions.push(session);
      }

      return res.json({ session });
    }
  } catch (err) {
    console.error('Start contest session error:', err);
    res.status(500).json({ message: 'Error starting contest session' });
  }
};

// Finish Contest Session
const finishContestSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (getIsConnected()) {
      let contest;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        contest = await Contest.findById(id);
      } else {
        contest = await Contest.findOne({ slug: id });
      }

      if (!contest) return res.status(404).json({ message: 'Contest not found' });

      let session = await ContestSession.findOne({ user: userId, contest: contest._id });
      if (session && !session.isFinished) {
        session.isFinished = true;
        session.finishedAt = new Date();
        await session.save();
      }

      return res.json({ message: 'Contest finished successfully', session });
    } else {
      const contest = inMemoryStore.contests.find(c => String(c._id) === id || c.slug === id);
      if (!contest) return res.status(404).json({ message: 'Contest not found' });

      if (!inMemoryStore.contestSessions) inMemoryStore.contestSessions = [];

      let session = inMemoryStore.contestSessions.find(s => String(s.user) === String(userId) && String(s.contest) === String(contest._id));
      if (session && !session.isFinished) {
        session.isFinished = true;
        session.finishedAt = new Date();
      }
      
      return res.json({ message: 'Contest finished successfully', session });
    }
  } catch (err) {
    console.error('Finish contest session error:', err);
    res.status(500).json({ message: 'Error finishing contest session' });
  }
};

// Get Contest Analytics (Admin Only)
const getContestAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    let contest, sessions, submissions;

    if (getIsConnected()) {
      contest = id.match(/^[0-9a-fA-F]{24}$/) 
        ? await Contest.findById(id).populate('problems')
        : await Contest.findOne({ slug: id }).populate('problems');
      
      if (!contest) return res.status(404).json({ message: 'Contest not found' });

      sessions = await ContestSession.find({ contest: contest._id })
        .populate('user', 'name teamName email')
        .lean();
      const Submission = require('../models/Submission');
      submissions = await Submission.find({ contest: contest._id })
        .select('user userName question questionTitle verdict score executionTime createdAt blurCount')
        .sort({ createdAt: -1 })
        .lean();
    } else {
      contest = inMemoryStore.contests.find(c => String(c._id) === id || c.slug === id);
      if (!contest) return res.status(404).json({ message: 'Contest not found' });

      sessions = (inMemoryStore.contestSessions || []).filter(s => String(s.contest) === String(contest._id));
      sessions = sessions.map(s => {
        const u = inMemoryStore.users.find(user => String(user._id) === String(s.user));
        return { ...s, user: u ? { name: u.name, teamName: u.teamName || u.name, email: u.email } : { name: 'Unknown', teamName: 'Unknown', email: '' } };
      });

      submissions = inMemoryStore.submissions.filter(s => String(s.contest) === String(contest._id));
      submissions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const participants = buildContestParticipants(contest, sessions, submissions);

    // Problem Level Stats
    const problemStatsMap = {};
    (contest.problems || []).forEach(p => {
      const qId = String(p._id || p.slug);
      problemStatsMap[qId] = {
        questionId: qId,
        title: p.title,
        difficulty: p.difficulty,
        totalSubmissions: 0,
        passedSubmissions: 0,
        uniqueSubmitters: new Set()
      };
    });

    submissions.forEach(sub => {
      const qId = String(sub.question);
      if (problemStatsMap[qId]) {
        problemStatsMap[qId].totalSubmissions += 1;
        problemStatsMap[qId].uniqueSubmitters.add(String(sub.user));
        if (sub.verdict === 'Accepted') {
          problemStatsMap[qId].passedSubmissions += 1;
        }
      }
    });

    const problemStats = Object.values(problemStatsMap).map(p => {
      const passRate = p.totalSubmissions > 0 ? Math.round((p.passedSubmissions / p.totalSubmissions) * 100) : 0;
      const submitterCount = p.uniqueSubmitters.size || 1;
      const avgAttempts = p.totalSubmissions > 0 ? (p.totalSubmissions / submitterCount).toFixed(1) : '0';
      return {
        questionId: p.questionId,
        title: p.title,
        difficulty: p.difficulty,
        totalSubmissions: p.totalSubmissions,
        passedSubmissions: p.passedSubmissions,
        passRate,
        avgAttempts
      };
    });

    const recentSubmissions = submissions.slice(0, 25).map(s => ({
      _id: s._id,
      userName: s.userName || 'Student',
      questionTitle: s.questionTitle || 'Problem',
      verdict: s.verdict,
      score: s.score,
      executionTime: s.executionTime,
      createdAt: s.createdAt,
      blurCount: s.blurCount || 0
    }));

    return res.json({
      contest,
      contestTitle: contest.title,
      participants,
      recentSubmissions,
      problemStats,
      systemHealth: {
        queueLength: 0,
        activeExecutions: 0,
        avgExecTimeMs: 140
      }
    });
  } catch (err) {
    console.error('Fetch contest analytics error:', err);
    res.status(500).json({ message: 'Error retrieving analytics', error: err.message });
  }
};

// Disqualify Participant (Admin Only)
const disqualifyParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, reason } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    if (getIsConnected()) {
      let contest = id.match(/^[0-9a-fA-F]{24}$/)
        ? await Contest.findById(id)
        : await Contest.findOne({ slug: id });

      if (!contest) return res.status(404).json({ message: 'Contest not found' });

      let session = await ContestSession.findOne({ user: userId, contest: contest._id });
      if (!session) {
        session = await ContestSession.create({
          user: userId,
          contest: contest._id,
          startTime: new Date(),
          isFinished: true,
          isDisqualified: true,
          disqualificationReason: reason || 'Manual Admin Disqualification'
        });
      } else {
        session.isDisqualified = true;
        session.disqualificationReason = reason || 'Manual Admin Disqualification';
        session.isFinished = true;
        await session.save();
      }

      return res.json({ message: 'Participant disqualified successfully', session });
    } else {
      const contest = (inMemoryStore.contests || []).find(c => String(c._id) === id || c.slug === id);
      if (!contest) return res.status(404).json({ message: 'Contest not found' });

      if (!inMemoryStore.contestSessions) inMemoryStore.contestSessions = [];
      let session = inMemoryStore.contestSessions.find(s => String(s.user) === String(userId) && String(s.contest) === String(contest._id));
      if (!session) {
        session = {
          _id: 'mem_sess_' + Date.now(),
          user: userId,
          contest: contest._id,
          startTime: new Date(),
          isFinished: true,
          isDisqualified: true,
          disqualificationReason: reason || 'Manual Admin Disqualification'
        };
        inMemoryStore.contestSessions.push(session);
      } else {
        session.isDisqualified = true;
        session.disqualificationReason = reason || 'Manual Admin Disqualification';
        session.isFinished = true;
      }
    }

    try {
      const socketService = require('../services/socketService');
      socketService.emitToUser(userId, 'user:disqualified', {
        contestId: id,
        reason: reason || 'Manual Admin Disqualification',
        timestamp: new Date()
      });
      socketService.emitToProctoring('proctoring:student_disqualified', {
        contestId: id,
        userId,
        reason: reason || 'Manual Admin Disqualification',
        timestamp: new Date()
      });
    } catch (sockErr) {
      console.warn('Socket disqualify broadcast error:', sockErr);
    }

    return res.json({ message: 'Participant disqualified successfully' });
  } catch (err) {
    console.error('Disqualify error:', err);
    res.status(500).json({ message: 'Error disqualifying participant' });
  }
};

// Qualify / Reinstate Participant (Admin Only)
const qualifyParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, note } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    if (getIsConnected()) {
      let contest = id.match(/^[0-9a-fA-F]{24}$/)
        ? await Contest.findById(id)
        : await Contest.findOne({ slug: id });

      if (!contest) return res.status(404).json({ message: 'Contest not found' });

      let session = await ContestSession.findOne({ user: userId, contest: contest._id });
      if (session) {
        session.isDisqualified = false;
        session.disqualificationReason = '';
        session.blurCount = 0;
        session.tabBlurCount = 0;
        session.isFinished = false;
        if (!session.antiCheatLogs) session.antiCheatLogs = [];
        session.antiCheatLogs.push({ event: `Reinstated & Qualified by Admin: ${note || 'Access Restored'}`, timestamp: new Date() });
        await session.save();
      }
    } else {
      const contest = (inMemoryStore.contests || []).find(c => String(c._id) === id || c.slug === id);
      if (!contest) return res.status(404).json({ message: 'Contest not found' });

      if (!inMemoryStore.contestSessions) inMemoryStore.contestSessions = [];
      let session = inMemoryStore.contestSessions.find(s => String(s.user) === String(userId) && String(s.contest) === String(contest._id));
      if (session) {
        session.isDisqualified = false;
        session.disqualificationReason = '';
        session.blurCount = 0;
        session.tabBlurCount = 0;
        session.isFinished = false;
        if (!session.antiCheatLogs) session.antiCheatLogs = [];
        session.antiCheatLogs.push({ event: `Reinstated & Qualified by Admin: ${note || 'Access Restored'}`, timestamp: new Date() });
      }
    }

    try {
      const socketService = require('../services/socketService');
      socketService.emitToUser(userId, 'user:qualified', {
        contestId: id,
        message: note || 'Reinstated & Qualified by Administrator',
        timestamp: new Date()
      });
      socketService.emitToProctoring('proctoring:student_qualified', {
        contestId: id,
        userId,
        note: note || 'Reinstated & Qualified by Administrator',
        timestamp: new Date()
      });
      socketService.emitLeaderboardUpdate(id);
    } catch (sockErr) {
      console.warn('Socket qualify broadcast error:', sockErr);
    }

    return res.json({ message: 'Participant qualified / reinstated successfully' });
  } catch (err) {
    console.error('Qualify error:', err);
    res.status(500).json({ message: 'Error qualifying participant' });
  }
};

// Log Anti-Cheat Event from student workspace (e.g. Tab blur, window switch, fullscreen exit)
const logAntiCheatEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { event, blurCount } = req.body;

    let contest;
    if (getIsConnected()) {
      contest = id.match(/^[0-9a-fA-F]{24}$/)
        ? await Contest.findById(id)
        : await Contest.findOne({ slug: id });
    } else {
      contest = (inMemoryStore.contests || []).find(c => String(c._id) === id || c.slug === id);
    }
    if (!contest) return res.status(404).json({ message: 'Contest not found' });

    const maxAllowedBlurs = contest.maxAllowedBlurs !== undefined ? Math.max(1, contest.maxAllowedBlurs) : 3;
    const autoDisqualify = contest.autoDisqualify !== undefined ? contest.autoDisqualify : true;
    let finalBlurCount = blurCount || 1;
    let isDisq = false;
    let disqReason = '';

    if (getIsConnected()) {
      let session = await ContestSession.findOne({ user: userId, contest: contest._id });
      if (!session) {
        session = await ContestSession.create({
          user: userId,
          contest: contest._id,
          startTime: new Date(),
          blurCount: blurCount || 1,
          antiCheatLogs: [{ event: event || 'Tab Switch / Window Blur', timestamp: new Date() }]
        });
      } else {
        session.blurCount = blurCount !== undefined ? blurCount : ((session.blurCount || 0) + 1);
        if (!session.antiCheatLogs) session.antiCheatLogs = [];
        session.antiCheatLogs.push({ event: event || `Tab Switch / Window Blur #${session.blurCount}`, timestamp: new Date() });
      }

      if (session.blurCount >= maxAllowedBlurs && autoDisqualify) {
        session.isDisqualified = true;
        session.isFinished = true;
        session.disqualificationReason = `Exceeded maximum allowed window focus / fullscreen violations (${session.blurCount}/${maxAllowedBlurs})`;
      }

      await session.save();
      finalBlurCount = session.blurCount;
      isDisq = Boolean(session.isDisqualified);
      disqReason = session.disqualificationReason;
    } else {
      if (!inMemoryStore.contestSessions) inMemoryStore.contestSessions = [];
      let session = inMemoryStore.contestSessions.find(s => String(s.user) === String(userId) && String(s.contest) === String(contest._id));
      if (!session) {
        session = {
          _id: 'mem_sess_' + Date.now(),
          user: userId,
          contest: contest._id,
          startTime: new Date(),
          blurCount: blurCount || 1,
          antiCheatLogs: [{ event: event || 'Tab Switch / Window Blur', timestamp: new Date() }],
          isDisqualified: false,
          disqualificationReason: ''
        };
        inMemoryStore.contestSessions.push(session);
      } else {
        session.blurCount = blurCount !== undefined ? blurCount : ((session.blurCount || 0) + 1);
        if (!session.antiCheatLogs) session.antiCheatLogs = [];
        session.antiCheatLogs.push({ event: event || `Tab Switch / Window Blur #${session.blurCount}`, timestamp: new Date() });
      }

      if (session.blurCount >= maxAllowedBlurs && autoDisqualify) {
        session.isDisqualified = true;
        session.isFinished = true;
        session.disqualificationReason = `Exceeded maximum allowed window focus / fullscreen violations (${session.blurCount}/${maxAllowedBlurs})`;
      }

      finalBlurCount = session.blurCount;
      isDisq = Boolean(session.isDisqualified);
      disqReason = session.disqualificationReason;
    }

    // Broadcast real-time violation event to admin proctoring dashboard
    try {
      const socketService = require('../services/socketService');
      socketService.emitToProctoring('proctoring:violation', {
        contestId: contest._id,
        contestTitle: contest.title,
        userId,
        blurCount: finalBlurCount,
        maxAllowedBlurs,
        event: event || `Tab Switch / Window Blur #${finalBlurCount}`,
        isDisqualified: isDisq,
        disqualificationReason: disqReason,
        timestamp: new Date()
      });

      if (isDisq) {
        socketService.emitToUser(userId, 'user:disqualified', {
          contestId: contest._id,
          reason: disqReason,
          timestamp: new Date()
        });
      }
    } catch (sockErr) {
      console.warn('Socket proctoring broadcast error:', sockErr);
    }

    return res.json({ success: true, blurCount: finalBlurCount, isDisqualified: isDisq });
  } catch (err) {
    console.error('Log anti-cheat event error:', err);
    res.status(500).json({ message: 'Error logging anti-cheat event' });
  }
};

// Get Global Proctoring Summary Across All Contests (Admin Only)
const getAllProctoringSummary = async (req, res) => {
  try {
    if (getIsConnected()) {
      const sessions = await ContestSession.find()
        .populate('user', 'name teamName email')
        .populate('contest', 'title maxAllowedBlurs autoDisqualify status')
        .sort({ updatedAt: -1, startTime: -1 })
        .lean();

      const candidates = sessions.map(session => {
        const u = session.user || {};
        const c = session.contest || {};
        const blurs = session.blurCount || 0;
        const maxBlurs = c.maxAllowedBlurs !== undefined ? c.maxAllowedBlurs : 3;
        const autoDisq = c.autoDisqualify !== false;
        const isDisq = session.isDisqualified || (autoDisq && blurs >= maxBlurs);

        return {
          _id: u._id || session.user,
          userId: u._id || session.user,
          name: u.name || 'Student',
          teamName: u.teamName || u.name || 'Team',
          email: u.email || 'N/A',
          contestId: c._id || session.contest,
          contestTitle: c.title || 'Contest',
          tabBlurCount: blurs,
          maxAllowedBlurs: maxBlurs,
          isDisqualified: isDisq,
          disqualificationReason: session.disqualificationReason || '',
          severityLabel: isDisq ? 'DISQUALIFIED' : (blurs > 0 ? 'WARNING' : 'NORMAL'),
          antiCheatLogs: session.antiCheatLogs || [],
          startTime: session.startTime
        };
      });

      return res.json({ candidates });
    } else {
      const sessions = (inMemoryStore.contestSessions || []).map(session => {
        const u = (inMemoryStore.users || []).find(user => String(user._id) === String(session.user)) || {};
        const c = (inMemoryStore.contests || []).find(cnt => String(cnt._id) === String(session.contest)) || {};
        const blurs = session.blurCount || 0;
        const maxBlurs = c.maxAllowedBlurs !== undefined ? c.maxAllowedBlurs : 3;
        const autoDisq = c.autoDisqualify !== false;
        const isDisq = session.isDisqualified || (autoDisq && blurs >= maxBlurs);

        return {
          _id: u._id || session.user,
          userId: u._id || session.user,
          name: u.name || 'Student',
          teamName: u.teamName || u.name || 'Team',
          email: u.email || 'N/A',
          contestId: c._id || session.contest,
          contestTitle: c.title || 'Contest',
          tabBlurCount: blurs,
          maxAllowedBlurs: maxBlurs,
          isDisqualified: isDisq,
          disqualificationReason: session.disqualificationReason || '',
          severityLabel: isDisq ? 'DISQUALIFIED' : (blurs > 0 ? 'WARNING' : 'NORMAL'),
          antiCheatLogs: session.antiCheatLogs || [],
          startTime: session.startTime
        };
      });

      return res.json({ candidates: sessions });
    }
  } catch (err) {
    console.error('Get all proctoring summary error:', err);
    res.status(500).json({ message: 'Error retrieving proctoring summary' });
  }
};

// Clear / Remove All Proctoring Data (Admin Only)
const clearProctoringData = async (req, res) => {
  try {
    const { contestId } = req.query;

    if (getIsConnected()) {
      let filter = {};
      if (contestId && contestId !== 'all') {
        filter.contest = contestId;
      }
      const deleted = await ContestSession.deleteMany(filter);
      
      // Also reset participants antiCheat logs inside Contest documents if stored there
      if (contestId && contestId !== 'all') {
        await Contest.updateOne(
          { _id: contestId },
          { $set: { "participants.$[].tabBlurCount": 0, "participants.$[].antiCheatLogs": [], "participants.$[].isDisqualified": false, "participants.$[].disqualificationReason": "" } }
        ).catch(() => {});
      } else {
        await Contest.updateMany(
          {},
          { $set: { "participants.$[].tabBlurCount": 0, "participants.$[].antiCheatLogs": [], "participants.$[].isDisqualified": false, "participants.$[].disqualificationReason": "" } }
        ).catch(() => {});
      }

      return res.json({
        success: true,
        message: `Successfully cleared proctoring logs and session data (${deleted.deletedCount} sessions removed).`,
        deletedCount: deleted.deletedCount
      });
    } else {
      const beforeCount = (inMemoryStore.contestSessions || []).length;
      if (contestId && contestId !== 'all') {
        inMemoryStore.contestSessions = (inMemoryStore.contestSessions || []).filter(s => String(s.contest) !== String(contestId));
        (inMemoryStore.contests || []).forEach(c => {
          if (String(c._id) === String(contestId) && c.participants) {
            c.participants.forEach(p => {
              p.tabBlurCount = 0;
              p.antiCheatLogs = [];
              p.isDisqualified = false;
              p.disqualificationReason = '';
            });
          }
        });
      } else {
        inMemoryStore.contestSessions = [];
        (inMemoryStore.contests || []).forEach(c => {
          if (c.participants) {
            c.participants.forEach(p => {
              p.tabBlurCount = 0;
              p.antiCheatLogs = [];
              p.isDisqualified = false;
              p.disqualificationReason = '';
            });
          }
        });
      }
      const deletedCount = beforeCount - (inMemoryStore.contestSessions || []).length;

      return res.json({
        success: true,
        message: 'Successfully cleared all proctoring logs and session data in memory store.',
        deletedCount
      });
    }
  } catch (err) {
    console.error('Clear proctoring data error:', err);
    res.status(500).json({ message: 'Error clearing proctoring data', error: err.message });
  }
};

module.exports = {
  getAllContests,
  getContestByIdOrSlug,
  createContest,
  updateContest,
  deleteContest,
  startContestSession,
  finishContestSession,
  getContestAnalytics,
  disqualifyParticipant,
  qualifyParticipant,
  logAntiCheatEvent,
  getAllProctoringSummary,
  clearProctoringData
};
