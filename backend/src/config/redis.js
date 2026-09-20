const Redis = require('ioredis');

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

let redisClient = null;
let isRedisAvailable = false;

const initRedis = () => {
  if (redisClient) return redisClient;

  try {
    redisClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        if (times > 5) {
          console.warn('[Redis] Max connection retries reached. Operating in Local In-Memory Fallback Mode.');
          isRedisAvailable = false;
          return null; // Stop retrying and stay in graceful fallback
        }
        return Math.min(times * 1000, 3000);
      }
    });

    redisClient.on('connect', () => {
      console.log(`⚡ Redis Connected successfully (${REDIS_HOST}:${REDIS_PORT})`);
      isRedisAvailable = true;
    });

    redisClient.on('error', (err) => {
      if (!isRedisAvailable) {
        // Suppress repetitive disconnect noise during local development without Redis
        return;
      }
      console.warn('[Redis Warning]:', err.message);
      isRedisAvailable = false;
    });

    redisClient.on('close', () => {
      isRedisAvailable = false;
    });

  } catch (err) {
    console.warn('[Redis Init Failed - Using In-Memory Fallback]:', err.message);
    isRedisAvailable = false;
  }

  return redisClient;
};

const getRedisClient = () => {
  if (!redisClient) initRedis();
  return redisClient;
};

const getIsRedisAvailable = () => {
  if (!redisClient) initRedis();
  return isRedisAvailable || (redisClient && (redisClient.status === 'ready' || redisClient.status === 'connect'));
};

module.exports = {
  initRedis,
  getRedisClient,
  getIsRedisAvailable,
  REDIS_CONFIG: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD
  }
};
