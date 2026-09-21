const { Queue, QueueEvents } = require('bullmq');
const { REDIS_CONFIG, getIsRedisAvailable, initRedis } = require('../config/redis');
const { executeLocally } = require('../services/judge0Service');

let submissionQueue = null;
let queueEvents = null;

const getSubmissionQueue = () => {
  if (submissionQueue) return submissionQueue;

  try {
    const connection = {
      host: REDIS_CONFIG.host,
      port: REDIS_CONFIG.port,
      password: REDIS_CONFIG.password,
      maxRetriesPerRequest: null
    };

    submissionQueue = new Queue('code-arena-submissions', {
      connection,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 5000
        },
        removeOnFail: {
          age: 86400 // Keep failed jobs for 24 hours
        }
      }
    });

    queueEvents = new QueueEvents('code-arena-submissions', { connection });

    console.log('⚡ BullMQ Submission Queue initialized on Redis');
  } catch (err) {
    console.warn('[BullMQ Queue Warning - Using In-Memory Fallback]:', err.message);
    submissionQueue = null;
  }

  return submissionQueue;
};

/**
 * Enqueue a code submission for distributed worker execution
 */
const enqueueSubmission = async (jobPayload) => {
  const queue = getSubmissionQueue();
  const redisOk = getIsRedisAvailable();

  if (queue && redisOk) {
    try {
      const job = await queue.add('evaluate-submission', jobPayload, {
        priority: jobPayload.isContest ? 1 : 2 // Contest submissions prioritized over practice
      });

      // Wait for the distributed judge worker to finish evaluation
      const result = await job.waitUntilFinished(queueEvents, 30000);
      return { fromWorker: true, jobId: job.id, ...result };
    } catch (err) {
      console.warn(`[BullMQ Worker Timeout/Error]: ${err.message}. Executing via Local Semaphore fallback.`);
    }
  }

  // Graceful Fallback: Local Execution
  const { language, code, stdin } = jobPayload;
  const directResult = await executeLocally(language, code, stdin);
  return { fromWorker: false, ...directResult };
};

/**
 * Get real-time queue health & stats for Admin dashboard
 */
const getQueueStats = async () => {
  const queue = getSubmissionQueue();
  if (!queue || !getIsRedisAvailable()) {
    return {
      mode: 'In-Memory Semaphore (Local Engine)',
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      isDistributed: false
    };
  }

  try {
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    return {
      mode: 'Distributed Multi-Judge Worker Fleet (Redis + BullMQ)',
      waiting: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      isDistributed: true
    };
  } catch (err) {
    return {
      mode: 'In-Memory Fallback',
      error: err.message,
      isDistributed: false
    };
  }
};

module.exports = {
  getSubmissionQueue,
  enqueueSubmission,
  getQueueStats
};
