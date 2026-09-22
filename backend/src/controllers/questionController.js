const Question = require('../models/Question');
const Contest = require('../models/Contest');
const { getIsConnected, inMemoryStore } = require('../config/db');

// Helper to generate slug from title
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

// Short-lived cache for the contest list used in question-visibility filtering
const contestListCache = { data: null, exp: 0 };

// Get All Questions (Public/Authenticated)
const getAllQuestions = async (req, res) => {
  try {
    const { difficulty, category, search } = req.query;
    const isAdmin = req.user && req.user.role === 'admin';

    if (getIsConnected()) {
      let query = {};

      // Integrity Guard & Public/Private Visibility Rules for Students:
      if (!isAdmin) {
        const now = new Date();

        // Use cache to avoid running Contest.find() on every question request
        let allContests;
        if (contestListCache.data && Date.now() < contestListCache.exp) {
          allContests = contestListCache.data;
        } else {
          allContests = await Contest.find({}, { problems: 1, endTime: 1, startTime: 1, status: 1, duration: 1 }).lean();
          contestListCache.data = allContests;
          contestListCache.exp = Date.now() + 15000; // 15s TTL
        }

        // Find active/upcoming contest problems (temporarily hidden from practice until contest ends)
        const activeContests = allContests.filter(c => {
          if (c.status === 'Ended') return false;
          const end = c.endTime ? new Date(c.endTime) : new Date(new Date(c.startTime || c.createdAt).getTime() + (c.duration || 60) * 60000);
          return end > now;
        });
        const activeProblemIds = activeContests.flatMap(c => (c.problems || []).map(p => String(p._id || p.slug || p)));

        // Find ended contest problems (unlocked for practice immediately after contest completion)
        const endedContests = allContests.filter(c => {
          if (c.status === 'Ended') return true;
          const end = c.endTime ? new Date(c.endTime) : new Date(new Date(c.startTime || c.createdAt).getTime() + (c.duration || 60) * 60000);
          return end <= now;
        });
        const endedProblemIds = endedContests.flatMap(c => (c.problems || []).map(p => String(p._id || p.slug || p)));

        query.$and = [
          { _id: { $nin: activeProblemIds } },
          {
            $or: [
              { isPublic: { $ne: false } },
              { _id: { $in: endedProblemIds } }
            ]
          }
        ];
      }

      if (difficulty && difficulty !== 'All') {
        query.difficulty = difficulty;
      }
      if (category && category !== 'All') {
        query.category = category;
      }
      if (search) {
        query.title = { $regex: search, $options: 'i' };
      }

      // Exclude heavy testCases and referenceSolution from listing to maintain sub-100ms response times
      const qQuery = Question.find(query).select('-testCases -referenceSolution').lean();
      const questions = await qQuery.sort({ createdAt: -1 });

      return res.json({ questions });
    } else {
      let questions = [...inMemoryStore.questions];

      if (!isAdmin) {
        const now = new Date();
        const allContests = inMemoryStore.contests || [];
        const activeContests = allContests.filter(c => {
          if (c.status === 'Ended') return false;
          const end = c.endTime ? new Date(c.endTime) : new Date(new Date(c.startTime || c.createdAt).getTime() + (c.duration || 60) * 60000);
          return end > now;
        });
        const activeProblemIds = activeContests.flatMap(c => (c.problems || []).map(p => String(p._id || p.slug || p)));

        const endedContests = allContests.filter(c => {
          if (c.status === 'Ended') return true;
          const end = c.endTime ? new Date(c.endTime) : new Date(new Date(c.startTime || c.createdAt).getTime() + (c.duration || 60) * 60000);
          return end <= now;
        });
        const endedProblemIds = endedContests.flatMap(c => (c.problems || []).map(p => String(p._id || p.slug || p)));

        questions = questions.filter(q => {
          const qId = String(q._id);
          const qSlug = q.slug;
          const isAct = activeProblemIds.includes(qId) || activeProblemIds.includes(qSlug);
          if (isAct) return false;

          const isEnded = endedProblemIds.includes(qId) || endedProblemIds.includes(qSlug);
          const isPub = q.isPublic !== false;
          return isPub || isEnded;
        });
      }

      if (difficulty && difficulty !== 'All') {
        questions = questions.filter(q => q.difficulty === difficulty);
      }
      if (category && category !== 'All') {
        questions = questions.filter(q => q.category === category);
      }
      if (search) {
        questions = questions.filter(q => q.title.toLowerCase().includes(search.toLowerCase()));
      }

      // Sanitize questions list
      const sanitized = questions.map(q => {
        if (!isAdmin) {
          const { testCases, ...rest } = q;
          const visibleTestCases = (testCases || []).filter(tc => !tc.isHidden);
          return { ...rest, sampleTestCases: visibleTestCases };
        } else {
          return {
            ...q,
            sampleTestCases: (q.testCases || []).filter(tc => !tc.isHidden)
          };
        }
      });

      return res.json({ questions: sanitized });
    }
  } catch (err) {
    console.error('Error fetching questions:', err);
    res.status(500).json({ message: 'Error retrieving questions' });
  }
};

const { executeCodeWithJudge0, normalizeOutput } = require('../services/judge0Service');

// Auto-validate reference solution against all test cases before problem goes live
const validateReferenceSolution = async (referenceSolution, allowedLanguages, testCases) => {
  if (!referenceSolution || !testCases || testCases.length === 0) return { valid: true };

  let langToTest = null;
  let solutionCode = '';

  const langs = allowedLanguages && allowedLanguages.length > 0 ? allowedLanguages : ['python', 'cpp', 'c', 'java', 'javascript'];
  for (const lang of langs) {
    if (referenceSolution[lang] && referenceSolution[lang].trim()) {
      langToTest = lang;
      solutionCode = referenceSolution[lang].trim();
      break;
    }
  }

  if (!langToTest || !solutionCode) {
    return { valid: true, skipped: true };
  }

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const execRes = await executeCodeWithJudge0(langToTest, solutionCode, tc.input);
    const actualNorm = normalizeOutput(execRes.stdout);
    const expectedNorm = normalizeOutput(tc.expectedOutput);

    const passed = (execRes.status === 'Accepted' || execRes.status === 'OK') && (actualNorm === expectedNorm);

    if (!passed) {
      return {
        valid: false,
        language: langToTest,
        testCaseIndex: i + 1,
        isHidden: tc.isHidden || false,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: execRes.stdout,
        status: execRes.status === 'Accepted' ? 'Wrong Answer' : execRes.status,
        stderr: execRes.stderr
      };
    }
  }

  return { valid: true, language: langToTest, testedCount: testCases.length };
};

// Get Question by ID or Slug
const getQuestionByIdOrSlug = async (req, res) => {
  try {
    const { id } = req.params;
    let question;

    if (getIsConnected()) {
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        question = await Question.findById(id);
      } else {
        question = await Question.findOne({ slug: id });
      }

      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }

      // Security Boundary: If requested by student, check visibility & upcoming contest status
      const questionObj = question.toObject();
      if (!req.user || req.user.role !== 'admin') {
        const now = new Date();
        
        // Find if problem belongs to an Upcoming contest (not yet started)
        const upcomingContestDocs = await Contest.find({
          status: 'Upcoming',
          problems: question._id
        });

        const isUpcoming = upcomingContestDocs.some(c => {
          if (c.status === 'Active' || c.status === 'Live' || c.status === 'Ended') return false;
          const start = c.startTime ? new Date(c.startTime) : new Date(c.createdAt || now);
          return (now.getTime() + 15000) < start.getTime();
        });

        if (isUpcoming) {
          return res.status(403).json({
            message: 'This problem is part of an upcoming contest and will be accessible when the contest begins.'
          });
        }

        // Private Problem Check: If isPublic is false, check if it belongs to an active, live, or ended contest
        if (question.isPublic === false) {
          const contestDocs = await Contest.find({
            problems: question._id
          });
          const hasActiveOrEndedContest = contestDocs.some(c => {
            if (c.status === 'Ended' || c.status === 'Active' || c.status === 'Live') return true;
            const start = c.startTime ? new Date(c.startTime) : new Date(new Date(c.createdAt || now).getTime());
            return (now.getTime() + 15000) >= start.getTime();
          });

          if (!hasActiveOrEndedContest) {
            return res.status(403).json({
              message: 'This problem is set to Private (Contest Use Only) and will be accessible after its contest starts.'
            });
          }
        }

        questionObj.sampleTestCases = (questionObj.testCases || []).filter(tc => !tc.isHidden);
        delete questionObj.testCases; // keep hidden test cases internal
        delete questionObj.referenceSolution; // keep reference solutions internal
      } else {
        questionObj.sampleTestCases = (questionObj.testCases || []).filter(tc => !tc.isHidden);
      }

      return res.json({ question: questionObj });
    } else {
      question = inMemoryStore.questions.find(q => String(q._id) === id || q.slug === id);
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }

      const questionObj = { ...question };
      if (!req.user || req.user.role !== 'admin') {
        const now = new Date();
        const isUpcoming = (inMemoryStore.contests || []).some(c => {
          const isProblemInContest = (c.problems || []).some(p => String(p._id || p.slug || p) === String(question._id) || String(p.slug || p) === question.slug);
          if (!isProblemInContest) return false;
          if (c.status === 'Ended' || c.status === 'Active' || c.status === 'Live') return false;
          const start = c.startTime ? new Date(c.startTime) : new Date(c.createdAt || now);
          return (now.getTime() + 15000) < start.getTime();
        });

        if (isUpcoming) {
          return res.status(403).json({
            message: 'This problem is part of an upcoming contest and will be accessible when the contest begins.'
          });
        }

        if (question.isPublic === false) {
          const hasActiveOrEndedContest = (inMemoryStore.contests || []).some(c => {
            const isProblemInContest = (c.problems || []).some(p => String(p._id || p.slug || p) === String(question._id) || String(p.slug || p) === question.slug);
            if (!isProblemInContest) return false;
            if (c.status === 'Ended' || c.status === 'Active' || c.status === 'Live') return true;
            const start = c.startTime ? new Date(c.startTime) : new Date(c.createdAt || now);
            return (now.getTime() + 15000) >= start.getTime();
          });

          if (!hasActiveOrEndedContest) {
            return res.status(403).json({
              message: 'This problem is set to Private (Contest Use Only) and will be accessible after its contest starts.'
            });
          }
        }

        questionObj.sampleTestCases = (questionObj.testCases || []).filter(tc => !tc.isHidden);
        delete questionObj.testCases;
        delete questionObj.referenceSolution;
      } else {
        questionObj.sampleTestCases = (questionObj.testCases || []).filter(tc => !tc.isHidden);
      }

      return res.json({ question: questionObj });
    }
  } catch (err) {
    console.error('Error getting question detail:', err);
    res.status(500).json({ message: 'Error fetching question details' });
  }
};

// Create Question (Admin Only)
const createQuestion = async (req, res) => {
  try {
    const {
      title,
      description,
      inputFormat,
      outputFormat,
      constraints,
      difficulty,
      category,
      tags,
      allowedLanguages,
      timeLimit,
      memoryLimit,
      sampleInput,
      sampleOutput,
      starterCode,
      referenceSolution,
      testCases,
      skipValidation
    } = req.body;

    if (!title || !description || !testCases || testCases.length === 0) {
      return res.status(400).json({ message: 'Title, description, and at least one test case are required' });
    }

    const publicCount = testCases.filter(tc => !tc.isHidden).length;
    const hiddenCount = testCases.filter(tc => tc.isHidden).length;
    if (publicCount === 0) {
      return res.status(400).json({ message: 'At least one public sample test case is required' });
    }

    const userPoints = req.body.points !== undefined && req.body.points !== null && !isNaN(Number(req.body.points)) && Number(req.body.points) > 0
      ? Number(req.body.points)
      : null;
    const calculatedPoints = userPoints !== null
      ? userPoints
      : testCases.reduce((acc, tc) => acc + (tc.marks !== undefined ? Number(tc.marks) : 10), 0);
    const slug = slugify(title);


    // Run Reference Solution Auto-Validation if explicitly requested or if full validation is enabled
    let validationResult = { valid: true };
    const shouldValidate = req.body.validateReference === true || (req.body.skipValidation === false && referenceSolution);
    if (shouldValidate && referenceSolution) {
      validationResult = await validateReferenceSolution(referenceSolution, allowedLanguages, testCases);
      if (!validationResult.valid && req.body.validateReference === true) {
        return res.status(400).json({
          message: `Reference solution validation failed on ${validationResult.isHidden ? 'Hidden' : 'Public'} Test Case #${validationResult.testCaseIndex}`,
          validationError: validationResult
        });
      }
    }

    if (getIsConnected()) {
      const existing = await Question.findOne({ slug });
      if (existing) {
        return res.status(400).json({ message: 'A question with this title already exists' });
      }

      const isPublic = req.body.isPublic !== undefined ? Boolean(req.body.isPublic) : true;

      const newQuestion = await Question.create({
        title,
        slug,
        description,
        inputFormat: inputFormat || '',
        outputFormat: outputFormat || '',
        constraints: constraints || '',
        difficulty: difficulty || 'Easy',
        category: category || 'Algorithms',
        points: calculatedPoints,
        isPublic,
        tags: tags || [],
        allowedLanguages: allowedLanguages || ['c', 'cpp', 'java', 'python', 'javascript'],
        timeLimit: Number(timeLimit) || 2.0,
        memoryLimit: Number(memoryLimit) || 256,
        sampleInput: sampleInput || '',
        sampleOutput: sampleOutput || '',
        starterCode: starterCode || {},
        referenceSolution: referenceSolution || {},
        testCases: testCases || [],
        createdBy: req.user ? req.user.id : null
      });

      // Keep in-memory store synchronized
      inMemoryStore.questions.push(newQuestion.toObject());

      const valMsg = validationResult.testedCount ? ` (Reference solution passed all ${validationResult.testedCount} test cases)` : '';
      return res.status(201).json({
        message: `Question created successfully in MongoDB${valMsg}!`,
        question: newQuestion,
        validationReport: validationResult
      });
    } else {
      const memExisting = inMemoryStore.questions.find(q => q.slug === slug);
      if (memExisting) {
        return res.status(400).json({ message: 'A question with this title already exists' });
      }

      const isPublic = req.body.isPublic !== undefined ? Boolean(req.body.isPublic) : true;

      const memQuestion = {
        _id: 'mem_q_' + Date.now() + '_' + Math.floor(Math.random()*1000),
        title,
        slug,
        description,
        inputFormat: inputFormat || '',
        outputFormat: outputFormat || '',
        constraints: constraints || '',
        difficulty: difficulty || 'Easy',
        category: category || 'Algorithms',
        points: calculatedPoints,
        isPublic,
        tags: tags || [],
        allowedLanguages: allowedLanguages || ['c', 'cpp', 'java', 'python', 'javascript'],
        timeLimit: Number(timeLimit) || 2.0,
        memoryLimit: Number(memoryLimit) || 256,
        sampleInput: sampleInput || '',
        sampleOutput: sampleOutput || '',
        starterCode: starterCode || {},
        referenceSolution: referenceSolution || {},
        testCases: testCases || [],
        submissionsCount: 0,
        acceptedCount: 0,
        createdBy: req.user ? req.user.id : null,
        createdAt: new Date()
      };

      inMemoryStore.questions.push(memQuestion);
      return res.status(201).json({ message: 'Question created successfully', question: memQuestion });
    }
  } catch (err) {
    console.error('Create question error:', err);
    res.status(500).json({ message: 'Error creating question', error: err.message });
  }
};

// Update Question (Admin Only)
const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.body.points !== undefined && req.body.points !== null && !isNaN(Number(req.body.points))) {
      req.body.points = Number(req.body.points);
    } else if (req.body.testCases && Array.isArray(req.body.testCases)) {
      req.body.points = req.body.testCases.reduce((acc, tc) => acc + (tc.marks !== undefined ? Number(tc.marks) : 10), 0);
    }


    if (getIsConnected()) {
      let updated;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        updated = await Question.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
      } else {
        updated = await Question.findOneAndUpdate({ slug: id }, req.body, { new: true, runValidators: true });
      }
      if (!updated) return res.status(404).json({ message: 'Question not found' });

      // Sync memory store
      const memIdx = inMemoryStore.questions.findIndex(q => String(q._id) === String(updated._id) || q.slug === updated.slug);
      if (memIdx !== -1) inMemoryStore.questions[memIdx] = updated.toObject();

      return res.json({ message: 'Question updated successfully in MongoDB', question: updated });
    } else {
      const index = inMemoryStore.questions.findIndex(q => String(q._id) === id || q.slug === id);
      if (index === -1) return res.status(404).json({ message: 'Question not found' });

      inMemoryStore.questions[index] = { ...inMemoryStore.questions[index], ...req.body };
      return res.json({ message: 'Question updated successfully', question: inMemoryStore.questions[index] });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error updating question', error: err.message });
  }
};

// Delete Question (Admin Only)
const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    if (getIsConnected()) {
      let deleted;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        deleted = await Question.findByIdAndDelete(id);
      } else {
        deleted = await Question.findOneAndDelete({ slug: id });
      }
      if (!deleted) return res.status(404).json({ message: 'Question not found' });

      // Clean from memory store if present
      const memIdx = inMemoryStore.questions.findIndex(q => String(q._id) === String(deleted._id) || q.slug === deleted.slug);
      if (memIdx !== -1) inMemoryStore.questions.splice(memIdx, 1);

      return res.json({ message: 'Question permanently deleted from MongoDB' });
    } else {
      const index = inMemoryStore.questions.findIndex(q => String(q._id) === id || q.slug === id);
      if (index === -1) return res.status(404).json({ message: 'Question not found' });

      inMemoryStore.questions.splice(index, 1);
      return res.json({ message: 'Question deleted successfully' });
    }
  } catch (err) {
    console.error('Delete question error:', err);
    res.status(500).json({ message: 'Error deleting question', error: err.message });
  }
};

// Restore Default Problem Bank (Admin Only)
const restoreDefaultQuestions = async (req, res) => {
  try {
    const { initialQuestionsList } = require('../config/db');
    const defaultProblems = initialQuestionsList || [];

    if (getIsConnected()) {
      await Question.deleteMany({});
      const toInsert = defaultProblems.map(({ _id, ...rest }) => rest);
      const created = await Question.insertMany(toInsert);
      return res.json({ message: 'Problem Bank restored successfully with standard problems.', questions: created });
    } else {
      inMemoryStore.questions = defaultProblems.map((q, idx) => ({
        _id: q._id || `mem_q_${idx + 1}`,
        submissionsCount: 0,
        acceptedCount: 0,
        createdAt: new Date(),
        isPublic: true,
        ...q
      }));
      return res.json({ message: 'Problem Bank restored successfully in Memory Store.', questions: inMemoryStore.questions });
    }
  } catch (err) {
    console.error('Restore default questions error:', err);
    res.status(500).json({ message: 'Error restoring default questions', error: err.message });
  }
};

// Export Questions (Admin Only) - Full 6-Section Criteria Specs
const exportQuestions = async (req, res) => {
  try {
    const { questionIds } = req.body || {};
    let questionsToExport = [];

    if (getIsConnected()) {
      let query = {};
      if (Array.isArray(questionIds) && questionIds.length > 0) {
        const objectIds = [];
        const slugs = [];
        questionIds.forEach(id => {
          if (typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
            objectIds.push(id);
          } else {
            slugs.push(String(id));
          }
        });
        query = {
          $or: [
            ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
            ...(slugs.length > 0 ? [{ slug: { $in: slugs } }] : [])
          ]
        };
      }

      // Fetch full documents including testCases, starterCode, referenceSolution
      const docs = await Question.find(query).lean();
      questionsToExport = docs;
    } else {
      let list = inMemoryStore.questions || [];
      if (Array.isArray(questionIds) && questionIds.length > 0) {
        const idSet = new Set(questionIds.map(String));
        list = list.filter(q => idSet.has(String(q._id)) || idSet.has(String(q.id)) || idSet.has(String(q.slug)));
      }
      questionsToExport = list;
    }

    // Clean and normalize to pure criteria specs retaining all 6 sections
    const formatted = questionsToExport.map(q => {
      const cleanTestCases = (q.testCases || []).map(tc => ({
        input: tc.input !== undefined ? String(tc.input) : '',
        expectedOutput: tc.expectedOutput !== undefined ? String(tc.expectedOutput) : '',
        isHidden: Boolean(tc.isHidden),
        explanation: tc.explanation || '',
        marks: tc.marks !== undefined && tc.marks !== null ? Number(tc.marks) : 10,
        ...(tc.timeLimitOverride !== undefined ? { timeLimitOverride: Number(tc.timeLimitOverride) } : {}),
        ...(tc.memoryLimitOverride !== undefined ? { memoryLimitOverride: Number(tc.memoryLimitOverride) } : {})
      }));

      return {
        // Section 1: Basic Info
        title: q.title || '',
        slug: q.slug || slugify(q.title || ''),
        difficulty: q.difficulty || 'Easy',
        category: q.category || 'Algorithms',
        points: q.points !== undefined && q.points !== null ? Number(q.points) : 100,
        isPublic: q.isPublic !== undefined ? Boolean(q.isPublic) : true,
        tags: Array.isArray(q.tags) ? q.tags : (typeof q.tags === 'string' ? q.tags.split(',').map(s => s.trim()).filter(Boolean) : []),

        // Section 2: Statement
        description: q.description || '',
        inputFormat: q.inputFormat || '',
        outputFormat: q.outputFormat || '',
        constraints: q.constraints || '',

        // Section 3: Settings & Execution Limits
        timeLimit: q.timeLimit !== undefined ? Number(q.timeLimit) : 2.0,
        memoryLimit: q.memoryLimit !== undefined ? Number(q.memoryLimit) : 256,
        allowedLanguages: Array.isArray(q.allowedLanguages) && q.allowedLanguages.length > 0
          ? q.allowedLanguages
          : ['c', 'cpp', 'java', 'python', 'javascript'],
        referenceSolution: q.referenceSolution && typeof q.referenceSolution === 'object'
          ? {
              c: q.referenceSolution.c || '',
              cpp: q.referenceSolution.cpp || '',
              java: q.referenceSolution.java || '',
              python: q.referenceSolution.python || '',
              javascript: q.referenceSolution.javascript || ''
            }
          : { c: '', cpp: '', java: '', python: '', javascript: '' },

        // Section 4: Starter Code (Boilerplates)
        starterCode: q.starterCode && typeof q.starterCode === 'object'
          ? {
              c: q.starterCode.c || '',
              cpp: q.starterCode.cpp || '',
              java: q.starterCode.java || '',
              python: q.starterCode.python || '',
              javascript: q.starterCode.javascript || ''
            }
          : { c: '', cpp: '', java: '', python: '', javascript: '' },

        // Section 5: Test Cases
        testCases: cleanTestCases,

        // Sample data for preview / compatibility
        sampleInput: q.sampleInput || '',
        sampleOutput: q.sampleOutput || ''
      };
    });

    return res.json({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      count: formatted.length,
      questions: formatted
    });
  } catch (err) {
    console.error('Export questions error:', err);
    res.status(500).json({ message: 'Error exporting questions', error: err.message });
  }
};

// Import Questions (Admin Only) - Full 6-Section Criteria Parser & Validator
const importQuestions = async (req, res) => {
  try {
    const rawQuestions = Array.isArray(req.body) ? req.body : (req.body.questions || []);
    const collisionStrategy = req.body.collisionStrategy || 'suffix'; // 'suffix' | 'overwrite' | 'skip'

    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      return res.status(400).json({ message: 'No questions provided for import.' });
    }

    const imported = [];
    const skipped = [];
    const overwritten = [];
    const errors = [];

    for (let i = 0; i < rawQuestions.length; i++) {
      const q = rawQuestions[i];
      const qTitle = q.title ? String(q.title).trim() : `Imported Question ${i + 1}`;

      if (!q.description) {
        errors.push({ index: i + 1, title: qTitle, error: 'Problem description is required.' });
        continue;
      }

      // Ensure test cases
      let testCases = Array.isArray(q.testCases) ? q.testCases : [];
      if (testCases.length === 0) {
        if (q.sampleInput || q.sampleOutput) {
          testCases = [{
            input: q.sampleInput || '',
            expectedOutput: q.sampleOutput || '',
            isHidden: false,
            explanation: 'Sample Test Case',
            marks: 10
          }];
        } else {
          errors.push({ index: i + 1, title: qTitle, error: 'At least one testcase is required.' });
          continue;
        }
      }

      // Ensure at least 1 public sample test case
      const hasPublic = testCases.some(tc => !tc.isHidden);
      if (!hasPublic) {
        testCases[0].isHidden = false;
      }

      const cleanTestCases = testCases.map(tc => ({
        input: tc.input !== undefined ? String(tc.input) : '',
        expectedOutput: tc.expectedOutput !== undefined ? String(tc.expectedOutput) : '',
        isHidden: Boolean(tc.isHidden),
        explanation: tc.explanation || '',
        marks: tc.marks !== undefined && tc.marks !== null ? Number(tc.marks) : 10,
        ...(tc.timeLimitOverride !== undefined ? { timeLimitOverride: Number(tc.timeLimitOverride) } : {}),
        ...(tc.memoryLimitOverride !== undefined ? { memoryLimitOverride: Number(tc.memoryLimitOverride) } : {})
      }));

      const points = q.points !== undefined && q.points !== null && !isNaN(Number(q.points)) && Number(q.points) > 0
        ? Number(q.points)
        : cleanTestCases.reduce((acc, tc) => acc + (tc.marks || 10), 0);

      let baseSlug = q.slug ? slugify(q.slug) : slugify(qTitle);
      if (!baseSlug) baseSlug = `question-${Date.now()}`;

      let finalTitle = qTitle;
      let finalSlug = baseSlug;

      // Check collision
      let existingDoc = null;
      if (getIsConnected()) {
        existingDoc = await Question.findOne({ $or: [{ slug: finalSlug }, { title: finalTitle }] });
      } else {
        existingDoc = (inMemoryStore.questions || []).find(existing => existing.slug === finalSlug || existing.title.toLowerCase() === finalTitle.toLowerCase());
      }

      if (existingDoc) {
        if (collisionStrategy === 'skip') {
          skipped.push({ title: finalTitle, slug: finalSlug, reason: 'Already exists (skipped)' });
          continue;
        } else if (collisionStrategy === 'overwrite') {
          // Overwrite existing question with imported specifications
          const updatePayload = {
            title: finalTitle,
            description: q.description,
            inputFormat: q.inputFormat || '',
            outputFormat: q.outputFormat || '',
            constraints: q.constraints || '',
            difficulty: ['Easy', 'Medium', 'Hard'].includes(q.difficulty) ? q.difficulty : 'Medium',
            category: q.category || 'Algorithms',
            points,
            isPublic: q.isPublic !== undefined ? Boolean(q.isPublic) : true,
            tags: Array.isArray(q.tags) ? q.tags : (typeof q.tags === 'string' ? q.tags.split(',').map(s => s.trim()).filter(Boolean) : []),
            allowedLanguages: Array.isArray(q.allowedLanguages) && q.allowedLanguages.length > 0
              ? q.allowedLanguages
              : ['c', 'cpp', 'java', 'python', 'javascript'],
            timeLimit: Number(q.timeLimit) || 2.0,
            memoryLimit: Number(q.memoryLimit) || 256,
            sampleInput: q.sampleInput || (cleanTestCases.find(tc => !tc.isHidden)?.input || ''),
            sampleOutput: q.sampleOutput || (cleanTestCases.find(tc => !tc.isHidden)?.expectedOutput || ''),
            starterCode: q.starterCode && typeof q.starterCode === 'object' ? q.starterCode : {},
            referenceSolution: q.referenceSolution && typeof q.referenceSolution === 'object' ? q.referenceSolution : {},
            testCases: cleanTestCases
          };

          if (getIsConnected()) {
            await Question.findByIdAndUpdate(existingDoc._id, { $set: updatePayload });
            const memIdx = (inMemoryStore.questions || []).findIndex(m => String(m._id) === String(existingDoc._id) || m.slug === existingDoc.slug);
            if (memIdx !== -1) {
              inMemoryStore.questions[memIdx] = { ...inMemoryStore.questions[memIdx], ...updatePayload };
            }
          } else {
            Object.assign(existingDoc, updatePayload);
          }

          overwritten.push({ title: finalTitle, slug: finalSlug });
          continue;
        } else {
          // collisionStrategy === 'suffix' -> generate unique slug and title
          let suffixCounter = 1;
          while (true) {
            const candidateSlug = `${baseSlug}-imported${suffixCounter > 1 ? `-${suffixCounter}` : ''}`;
            const candidateTitle = `${qTitle} (Imported${suffixCounter > 1 ? ` ${suffixCounter}` : ''})`;
            let candidateExists;
            if (getIsConnected()) {
              candidateExists = await Question.findOne({ $or: [{ slug: candidateSlug }, { title: candidateTitle }] });
            } else {
              candidateExists = (inMemoryStore.questions || []).some(m => m.slug === candidateSlug || m.title.toLowerCase() === candidateTitle.toLowerCase());
            }
            if (!candidateExists) {
              finalSlug = candidateSlug;
              finalTitle = candidateTitle;
              break;
            }
            suffixCounter++;
          }
        }
      }

      // Construct question document
      const questionData = {
        title: finalTitle,
        slug: finalSlug,
        description: q.description,
        inputFormat: q.inputFormat || '',
        outputFormat: q.outputFormat || '',
        constraints: q.constraints || '',
        difficulty: ['Easy', 'Medium', 'Hard'].includes(q.difficulty) ? q.difficulty : 'Medium',
        category: q.category || 'Algorithms',
        points,
        isPublic: q.isPublic !== undefined ? Boolean(q.isPublic) : true,
        tags: Array.isArray(q.tags) ? q.tags : (typeof q.tags === 'string' ? q.tags.split(',').map(s => s.trim()).filter(Boolean) : []),
        allowedLanguages: Array.isArray(q.allowedLanguages) && q.allowedLanguages.length > 0
          ? q.allowedLanguages
          : ['c', 'cpp', 'java', 'python', 'javascript'],
        timeLimit: Number(q.timeLimit) || 2.0,
        memoryLimit: Number(q.memoryLimit) || 256,
        sampleInput: q.sampleInput || (cleanTestCases.find(tc => !tc.isHidden)?.input || ''),
        sampleOutput: q.sampleOutput || (cleanTestCases.find(tc => !tc.isHidden)?.expectedOutput || ''),
        starterCode: q.starterCode && typeof q.starterCode === 'object' ? q.starterCode : {},
        referenceSolution: q.referenceSolution && typeof q.referenceSolution === 'object' ? q.referenceSolution : {},
        testCases: cleanTestCases,
        submissionsCount: 0,
        acceptedCount: 0,
        createdBy: req.user ? req.user.id : null,
        createdAt: new Date()
      };

      if (getIsConnected()) {
        const createdDoc = await Question.create(questionData);
        inMemoryStore.questions.push(createdDoc.toObject());
        imported.push({ title: createdDoc.title, slug: createdDoc.slug, id: createdDoc._id });
      } else {
        const memQ = {
          _id: 'mem_q_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
          ...questionData
        };
        inMemoryStore.questions.push(memQ);
        imported.push({ title: memQ.title, slug: memQ.slug, id: memQ._id });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Import processed: ${imported.length} imported, ${overwritten.length} overwritten, ${skipped.length} skipped.`,
      importedCount: imported.length,
      overwrittenCount: overwritten.length,
      skippedCount: skipped.length,
      imported,
      overwritten,
      skipped,
      errors
    });
  } catch (err) {
    console.error('Import questions error:', err);
    res.status(500).json({ message: 'Error importing questions', error: err.message });
  }
};

module.exports = {
  getAllQuestions,
  getQuestionByIdOrSlug,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  restoreDefaultQuestions,
  exportQuestions,
  importQuestions
};
