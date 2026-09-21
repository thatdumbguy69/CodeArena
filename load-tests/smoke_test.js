import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '10s',
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:5000';

export default function () {
  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, { 'Health status is 200': (r) => r.status === 200 });

  // 2. Questions list
  const qRes = http.get(`${BASE_URL}/api/questions`);
  check(qRes, { 'Questions status is 200': (r) => r.status === 200 });

  // 3. Contests list
  const cRes = http.get(`${BASE_URL}/api/contests`);
  check(cRes, { 'Contests status is 200': (r) => r.status === 200 });

  sleep(1);
}
