const dotenv = require('dotenv');
dotenv.config();

process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '64';
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const { seedData } = require('../seed/seed');

// Process-level Crash Prevention Guards
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION PREVENTED CRASH]:', err && err.message ? err.message : err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION PREVENTED CRASH]:', reason && reason.message ? reason.message : reason);
});

const app = express();

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'x-requested-with', 'Accept', 'Origin']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Local Time Formatter for Server Logs (matching system local timezone)
const getLocalTimestamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const padMs = (n) => String(n).padStart(3, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  const secs = pad(d.getSeconds());
  const ms = padMs(d.getMilliseconds());
  return `${year}-${month}-${day} ${hours}:${mins}:${secs}.${ms}`;
};

// Request Logger
app.use((req, res, next) => {
  console.log(`[${getLocalTimestamp()}] ${req.method} ${req.url}`);
  next();
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const questionRoutes = require('./routes/questionRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const contestRoutes = require('./routes/contestRoutes');
const contactRoutes = require('./routes/contactRoutes');
const settingRoutes = require('./routes/settingRoutes');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/execute', submissionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/settings', settingRoutes);


// Healthcheck Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'CodeArena API', timestamp: new Date() });
});

app.get('/api/health/cluster', async (req, res) => {
  const { getQueueStats } = require('./queues/submissionQueue');
  const { getIsRedisAvailable } = require('./config/redis');
  const { getIsConnected } = require('./config/db');

  const queueStats = await getQueueStats();
  res.json({
    status: 'ok',
    timestamp: new Date(),
    redisConnected: getIsRedisAvailable(),
    databaseConnected: getIsConnected(),
    clusterCapacity: '100+ Concurrent Users',
    queue: queueStats
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const http = require('http');
const socketService = require('./services/socketService');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  const { initRedis } = require('./config/redis');
  initRedis();

  await connectDB();
  await seedData();

  const httpServer = http.createServer(app);
  socketService.init(httpServer);

  const server = httpServer.listen(PORT, HOST, () => {
    console.log(`================================================`);
    console.log(`🚀 CodeArena Backend API running on http://${HOST}:${PORT}`);
    console.log(`⚡ Real-Time WebSockets Engine (Socket.IO) active`);
    console.log(`⚡ Distributed Multi-Judge & Concurrency Engine Online (100+ Capacity)`);
    console.log(`👉 http://${HOST}:${PORT}/api/health`);
    console.log(`================================================`);
  });

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.timeout = 120000;
};

startServer();
