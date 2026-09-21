import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom Metrics
const authDuration = new Trend('auth_duration');
const problemsFetchDuration = new Trend('problems_fetch_duration');
const codeRunDuration = new Trend('code_run_duration');
const codeSubmitDuration = new Trend('code_submit_duration');
const successRate = new Rate('successful_requests');
const submissionCounter = new Counter('total_code_submissions');

export const options = {
  stages: [
    { duration: '10s', target: 20 },   // Warm up to 20 concurrent users
    { duration: '15s', target: 50 },   // Ramp up to 50 concurrent users
    { duration: '20s', target: 100 },  // Surge to 100 concurrent users
    { duration: '30s', target: 100 },  // Sustain 100 simultaneous users under peak load
    { duration: '10s', target: 0 },    // Ramp down cleanly
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],              // Total HTTP error rate stays below 5%
    successful_requests: ['rate>0.95'],          // Logical assertions > 95%
    auth_duration: ['p(95)<6000'],               // Auth under 6s during 100-VU registration wave
    problems_fetch_duration: ['p(95)<4000'],     // Platform API discovery under 4s
    code_run_duration: ['p(95)<12000'],          // Compiler code executions under 12s
    code_submit_duration: ['p(95)<25000'],       // Heavy multi-testcase submissions under 25s
    http_req_duration: ['p(95)<20000'],          // Overall aggregate p95 < 20s
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:5000';

const SAMPLE_PYTHON_CODE = `import sys

def main():
    lines = sys.stdin.read().split()
    if not lines:
        return
    print("1")

if __name__ == '__main__':
    main()
`;

// Setup function: Executed once before the test starts to discover existing problems dynamically
export function setup() {
  const res = http.get(`${BASE_URL}/api/questions`);
  let questionSlug = 'trees';
  let questionId = '6aa84b74eabd4831f352a810';

  if (res.status === 200) {
    try {
      const body = JSON.parse(res.body);
      if (body.questions && body.questions.length > 0) {
        const q = body.questions[0];
        questionSlug = q.slug || q._id;
        questionId = q._id || q.slug;
      }
    } catch (e) {
      console.warn('Could not parse questions list in setup:', e);
    }
  }

  return {
    questionSlug,
    questionId,
    baseUrl: BASE_URL
  };
}

function getUniqueUser(vuId, iterId) {
  const timestamp = Date.now();
  return {
    name: `Candidate_VU${vuId}`,
    email: `candidate_vu${vuId}_${iterId}_${timestamp}@test.com`,
    password: `TestPassword123!`
  };
}

export default function (data) {
  const vuId = __VU;
  const iterId = __ITER;
  const targetSlug = data.questionSlug || 'trees';
  const targetId = data.questionId || 'trees';
  let authToken = null;

  // ==========================================
  // SCENARIO 1: User Registration / Authentication
  // ==========================================
  group('01_Authentication', function () {
    const userPayload = JSON.stringify(getUniqueUser(vuId, iterId));
    const headers = { 'Content-Type': 'application/json' };

    const regStart = Date.now();
    const regRes = http.post(`${BASE_URL}/api/auth/register`, userPayload, { headers });
    authDuration.add(Date.now() - regStart);

    if (regRes.status === 201 || regRes.status === 200) {
      try {
        const body = JSON.parse(regRes.body);
        if (body.token) authToken = body.token;
      } catch (e) {}
    }

    // Fallback: Login with existing candidate if registration is already present
    if (!authToken) {
      const loginPayload = JSON.stringify({
        email: 'student@codearena.com',
        password: 'student123'
      });
      const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, { headers });
      if (loginRes.status === 200) {
        try {
          const body = JSON.parse(loginRes.body);
          if (body.token) authToken = body.token;
        } catch (e) {}
      }
    }

    const authCheck = check(authToken, {
      'Candidate is authenticated with JWT token': (t) => t !== null && t.length > 10,
    });
    successRate.add(authCheck);
  });

  sleep(0.5);

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
  };

  // ==========================================
  // SCENARIO 2: Explore Problems, Contests & Leaderboard
  // ==========================================
  group('02_Platform_Navigation', function () {
    // 1. Fetch Question Repository
    const qStart = Date.now();
    const qRes = http.get(`${BASE_URL}/api/questions`, { headers: authHeaders });
    problemsFetchDuration.add(Date.now() - qStart);

    const qCheck = check(qRes, {
      'Questions fetch status 200': (r) => r.status === 200,
      'Questions list received': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.questions) && body.questions.length > 0;
        } catch (e) {
          return false;
        }
      },
    });
    successRate.add(qCheck);

    // 2. Fetch Live Contests
    const contestRes = http.get(`${BASE_URL}/api/contests`, { headers: authHeaders });
    const cCheck = check(contestRes, {
      'Contests list status 200': (r) => r.status === 200,
    });
    successRate.add(cCheck);

    // 3. Fetch Leaderboard & Candidate Stats
    const lbRes = http.get(`${BASE_URL}/api/leaderboard`, { headers: authHeaders });
    check(lbRes, { 'Leaderboard fetch status 200': (r) => r.status === 200 });

    if (authToken) {
      const statsRes = http.get(`${BASE_URL}/api/leaderboard/student-stats`, { headers: authHeaders });
      check(statsRes, { 'Student stats status 200': (r) => r.status === 200 });
    }
  });

  sleep(0.5);

  // ==========================================
  // SCENARIO 3: Open Problem Workspace
  // ==========================================
  group('03_Problem_Workspace', function () {
    const probRes = http.get(`${BASE_URL}/api/questions/${targetSlug}`, { headers: authHeaders });
    const probCheck = check(probRes, {
      'Problem detail status 200': (r) => r.status === 200,
      'Problem title is valid': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.question && (body.question.title || body.question.slug);
        } catch (e) {
          return false;
        }
      },
    });
    successRate.add(probCheck);
  });

  sleep(0.8);

  // ==========================================
  // SCENARIO 4: Real-time Code Execution & Submission (Judge Engine)
  // ==========================================
  group('04_Code_Execution_And_Submission', function () {
    if (!authToken) return;

    // 1. Dry Run Code
    const runPayload = JSON.stringify({
      questionId: targetId,
      language: 'python',
      code: SAMPLE_PYTHON_CODE
    });

    const runStart = Date.now();
    const runRes = http.post(`${BASE_URL}/api/submissions/run`, runPayload, { headers: authHeaders });
    codeRunDuration.add(Date.now() - runStart);

    const runSuccess = check(runRes, {
      'Code Run status is 200': (r) => r.status === 200,
    });
    successRate.add(runSuccess);

    sleep(0.5);

    // 2. Submit Solution
    const submitPayload = JSON.stringify({
      questionId: targetId,
      language: 'python',
      code: SAMPLE_PYTHON_CODE,
      antiCheatLogs: [{ event: `k6 VU_${vuId} submission`, timestamp: new Date() }],
      blurCount: 0
    });

    const subStart = Date.now();
    const subRes = http.post(`${BASE_URL}/api/submissions/submit`, submitPayload, { headers: authHeaders });
    codeSubmitDuration.add(Date.now() - subStart);

    const subSuccess = check(subRes, {
      'Code Submit status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'Verdict received from Judge': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.submission && (body.submission.verdict || body.submission.status);
        } catch (e) {
          return false;
        }
      }
    });

    successRate.add(subSuccess);
    if (subSuccess) {
      submissionCounter.add(1);
    }
  });

  sleep(1);
}
