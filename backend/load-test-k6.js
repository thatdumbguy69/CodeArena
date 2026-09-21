import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics
const successfulLogins = new Counter('successful_logins');
const successfulRuns = new Counter('successful_dry_runs');
const successfulSubmissions = new Counter('successful_submissions');
const failureRate = new Rate('custom_failure_rate');
const codeExecDuration = new Trend('code_execution_duration_ms');

// Test Configuration (30 Concurrent Users)
export const options = {
  stages: [
    { duration: '10s', target: 10 }, // Ramp-up to 10 users
    { duration: '15s', target: 30 }, // Ramp-up to 30 concurrent users
    { duration: '45s', target: 30 }, // Sustained peak load with 30 users
    { duration: '15s', target: 10 }, // Ramp-down to 10 users
    { duration: '5s', target: 0 },   // Graceful teardown
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],      // Total HTTP error rate < 5%
    http_req_duration: ['p(95)<3000'],   // 95% of requests must complete within 3 seconds
    code_execution_duration_ms: ['p(90)<4000'], // 90% of code executions under 4s
  },
};

const BASE_URL = 'http://localhost:5000/api';

// Code snippets in different languages for realistic multi-language load
const codeSnippets = [
  {
    language: 'python',
    runCode: 'import sys\nlines = sys.stdin.read().split()\nprint("Python load test output")',
    submitCode: 'import sys\nlines = sys.stdin.read().split()\nif lines:\n    print(lines[0])\nelse:\n    print("ok")'
  },
  {
    language: 'cpp',
    runCode: '#include <iostream>\nusing namespace std;\nint main() { cout << "C++ load test output" << endl; return 0; }',
    submitCode: '#include <iostream>\n#include <string>\nusing namespace std;\nint main() { string s; if (cin >> s) cout << s << endl; else cout << "ok" << endl; return 0; }'
  },
  {
    language: 'javascript',
    runCode: 'console.log("JS load test output");',
    submitCode: 'const fs = require("fs"); const input = fs.readFileSync(0, "utf-8").trim(); console.log(input || "ok");'
  }
];

export default function () {
  const vuId = __VU; // Unique ID per Virtual User (1 to 30)
  const userEmail = `student_load_${vuId}@codearena.test`;
  const userPassword = 'TestPassword@123';
  const userName = `Student VU ${vuId}`;

  const jsonHeaders = {
    headers: { 'Content-Type': 'application/json' },
  };

  let token = null;

  // 1. User Registration / Login
  group('1. Authentication Flow', function () {
    // Attempt Login
    let loginRes = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: userEmail, password: userPassword }),
      jsonHeaders
    );

    // If user doesn't exist, auto-register
    if (loginRes.status === 400 || loginRes.status === 401 || loginRes.status === 404) {
      let regRes = http.post(
        `${BASE_URL}/auth/register`,
        JSON.stringify({
          name: userName,
          email: userEmail,
          password: userPassword,
          role: 'student'
        }),
        jsonHeaders
      );

      if (regRes.status === 201 || regRes.status === 200) {
        token = regRes.json('token');
      } else {
        // Fallback login with existing seed credentials
        loginRes = http.post(
          `${BASE_URL}/auth/login`,
          JSON.stringify({ email: 'tabraizsmd@gmail.com', password: 'Shamstabraiz@7931' }),
          jsonHeaders
        );
        if (loginRes.status === 200) {
          token = loginRes.json('token');
        }
      }
    } else if (loginRes.status === 200) {
      token = loginRes.json('token');
    }

    const authSuccess = check(token, { 'Auth Token obtained': (t) => t !== null && t !== undefined });
    if (authSuccess) {
      successfulLogins.add(1);
    } else {
      failureRate.add(1);
    }
  });

  // If unauthenticated, exit iteration
  if (!token) {
    sleep(1);
    return;
  }

  const authHeaders = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  // 2. Browse Platform (Questions & Contests)
  let targetQuestionId = null;

  group('2. Browsing & Problem Discovery', function () {
    // Get Current Profile
    let meRes = http.get(`${BASE_URL}/auth/me`, authHeaders);
    check(meRes, { 'GET /auth/me is 200': (r) => r.status === 200 });

    // Fetch Questions list
    let qRes = http.get(`${BASE_URL}/questions`, authHeaders);
    const qSuccess = check(qRes, { 'GET /questions is 200': (r) => r.status === 200 });

    if (qSuccess) {
      const qList = qRes.json('questions') || [];
      if (qList.length > 0) {
        // Pick a problem based on VU ID
        const selected = qList[vuId % qList.length];
        targetQuestionId = selected._id || selected.slug;
      }
    }

    // Fetch Contests list
    let cRes = http.get(`${BASE_URL}/contests`, authHeaders);
    check(cRes, { 'GET /contests is 200': (r) => r.status === 200 });

    // If question ID found, fetch problem detail
    if (targetQuestionId) {
      let detailRes = http.get(`${BASE_URL}/questions/${targetQuestionId}`, authHeaders);
      check(detailRes, { 'GET /questions/:id is 200': (r) => r.status === 200 });
    }
  });

  sleep(1); // Simulate student reading problem

  // Pick language variation per user
  const snippet = codeSnippets[vuId % codeSnippets.length];

  // 3. Dry Run Code Execution
  group('3. Dry Run Code Execution', function () {
    const runPayload = JSON.stringify({
      questionId: targetQuestionId || 'two-sum',
      language: snippet.language,
      code: snippet.runCode,
      customInput: '42'
    });

    const startRun = new Date().getTime();
    let runRes = http.post(`${BASE_URL}/submissions/run`, runPayload, authHeaders);
    const runDuration = new Date().getTime() - startRun;
    codeExecDuration.add(runDuration);

    const runOk = check(runRes, {
      'POST /submissions/run is 200': (r) => r.status === 200,
    });

    if (runOk) {
      successfulRuns.add(1);
    } else {
      failureRate.add(1);
    }
  });

  sleep(1); // Simulate reviewing run results

  // 4. Submit Code & Evaluate
  group('4. Official Code Submission', function () {
    const submitPayload = JSON.stringify({
      questionId: targetQuestionId || 'two-sum',
      language: snippet.language,
      code: snippet.submitCode
    });

    const startSubmit = new Date().getTime();
    let subRes = http.post(`${BASE_URL}/submissions/submit`, submitPayload, authHeaders);
    const subDuration = new Date().getTime() - startSubmit;
    codeExecDuration.add(subDuration);

    const subOk = check(subRes, {
      'POST /submissions/submit is 200 or 201': (r) => r.status === 200 || r.status === 201,
    });

    if (subOk) {
      successfulSubmissions.add(1);
    } else {
      failureRate.add(1);
    }
  });

  // 5. Check Submissions & Leaderboard
  group('5. Review Results & Leaderboard', function () {
    let mySubsRes = http.get(`${BASE_URL}/submissions`, authHeaders);
    check(mySubsRes, { 'GET /submissions is 200': (r) => r.status === 200 });

    let lbRes = http.get(`${BASE_URL}/leaderboard`, authHeaders);
    check(lbRes, { 'GET /leaderboard is 200': (r) => r.status === 200 });
  });

  sleep(2); // Think time between iterations
}