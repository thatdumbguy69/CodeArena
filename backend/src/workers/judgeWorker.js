const { Worker } = require('bullmq');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const { REDIS_CONFIG } = require('../config/redis');
const { executeLocally } = require('../services/judge0Service');

const WORKER_ID = process.env.WORKER_ID || `judge-worker-${process.pid}`;
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '10', 10);

console.log(`================================================`);
console.log(`🛡️  CodeArena Distributed Judge Worker Online`);
console.log(`🆔 Worker ID: ${WORKER_ID}`);
console.log(`⚡ Concurrency Capacity: ${CONCURRENCY} parallel execution workers`);
console.log(`🔌 Redis Target: ${REDIS_CONFIG.host}:${REDIS_CONFIG.port}`);
console.log(`================================================`);

const connection = {
  host: REDIS_CONFIG.host,
  port: REDIS_CONFIG.port,
  password: REDIS_CONFIG.password,
  maxRetriesPerRequest: null
};

// Process-level crash guards
process.on('uncaughtException', (err) => {
  console.error(`[${WORKER_ID} UNCAUGHT EXCEPTION]:`, err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error(`[${WORKER_ID} UNHANDLED REJECTION]:`, reason);
});

const worker = new Worker(
  'code-arena-submissions',
  async (job) => {
    const startTime = Date.now();
    const { language, code, stdin, submissionId, questionId, userId } = job.data;

    console.log(`[${WORKER_ID}] ⚙️  Processing Job #${job.id} | Lang: ${language} | SubId: ${submissionId || 'direct'} | User: ${userId || 'anon'}`);

    try {
      const result = await executeLocally(language, code, stdin);
      const duration = Date.now() - startTime;

      console.log(`[${WORKER_ID}] ✅ Completed Job #${job.id} in ${duration}ms | Status: ${result.status}`);

      return {
        success: true,
        workerId: WORKER_ID,
        durationMs: duration,
        ...result
      };
    } catch (err) {
      console.error(`[${WORKER_ID}] ❌ Error evaluating Job #${job.id}:`, err.message);
      return {
        success: false,
        workerId: WORKER_ID,
        status: 'Runtime Error',
        stderr: err.message,
        stdout: '',
        time: 0,
        memory: 0
      };
    }
  },
  {
    connection,
    concurrency: CONCURRENCY,
    limiter: {
      max: 100,
      duration: 1000 // Rate cap: up to 100 evaluations/sec per worker node
    }
  }
);

worker.on('ready', () => {
  console.log(`⚡ [${WORKER_ID}] Ready and actively listening for evaluation jobs from Redis queue...`);
});

worker.on('error', (err) => {
  console.error(`[${WORKER_ID} Error]:`, err.message);
});

worker.on('failed', (job, err) => {
  console.error(`[${WORKER_ID}] Job #${job?.id} failed:`, err.message);
});

module.exports = worker;
