const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const { REDIS_CONFIG, getIsRedisAvailable } = require('../config/redis');

const JWT_SECRET = process.env.JWT_SECRET || 'codearena_super_secret_jwt_key_2026';

let io = null;

const init = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true
    }
  });

  // Attach Redis Adapter if Redis cluster is active
  if (getIsRedisAvailable()) {
    try {
      const pubClient = new Redis({
        host: REDIS_CONFIG.host,
        port: REDIS_CONFIG.port,
        password: REDIS_CONFIG.password,
        maxRetriesPerRequest: null
      });
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      console.log('⚡ Socket.IO Redis Adapter activated for multi-server scaling');
    } catch (adapterErr) {
      console.warn('[Socket.IO Redis Adapter Warning]:', adapterErr.message);
    }
  }

  // Socket.IO authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.data.user = decoded;
        socket.data.isAdmin = decoded.role === 'admin';
      } catch (e) {
        socket.data.user = null;
        socket.data.isAdmin = false;
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    const isSocketAdmin = () => {
      return !!(socket.data?.isAdmin || socket.rooms.has('admin_proctoring'));
    };

    // Participant / Client joins a contest room & user room
    socket.on('join_contest', (data) => {
      const { contestId, contestSlug, userId, userName, teamName, email } = data || {};
      if (contestId) {
        socket.join(`contest_${contestId}`);
      }
      if (contestSlug && contestSlug !== contestId) {
        socket.join(`contest_${contestSlug}`);
      }
      if (userId) {
        socket.join(`user_${userId}`);
      }

      // Notify admin proctoring room of participant presence
      if (contestId && (userId || email)) {
        io.to('admin_proctoring').emit('proctoring:student_joined', {
          contestId,
          userId,
          name: userName || 'Student',
          teamName: teamName || userName || 'Team',
          email,
          joinedAt: new Date()
        });
      }
    });

    // Admin joins the live proctoring hub room
    socket.on('join_admin_proctoring', (data) => {
      const token = data?.token || socket.handshake.auth?.token;
      if (token && !socket.data?.isAdmin) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          if (decoded.role === 'admin') {
            socket.data.isAdmin = true;
            socket.data.user = decoded;
          }
        } catch (e) {}
      }

      if (socket.data?.isAdmin) {
        socket.join('admin_proctoring');
      }
    });

    // Student reports focus loss / tab blur in real-time
    socket.on('student:blur_event', (data) => {
      const { contestId, userId, userName, teamName, email, blurCount, maxAllowedBlurs, isDisqualified, disqualificationReason, event } = data || {};
      const maxAllowed = maxAllowedBlurs || 2;
      const isDisq = !!isDisqualified || (blurCount >= maxAllowed);
      
      const payload = {
        contestId,
        userId,
        name: userName || 'Student',
        userName: userName || 'Student',
        teamName: teamName || userName || 'Team',
        email: email || '',
        blurCount: blurCount || 1,
        maxAllowedBlurs: maxAllowed,
        isDisqualified: isDisq,
        disqualificationReason: disqualificationReason || (isDisq ? `Exceeded max allowed tab switches (${blurCount || maxAllowed}/${maxAllowed})` : ''),
        event: event || `Tab Switch / Focus Lost #${blurCount || 1}`,
        timestamp: new Date()
      };

      io.to('admin_proctoring').emit('proctoring:violation', payload);

      if (isDisq) {
        // Emit live push notification event for student disqualification
        io.to('admin_proctoring').emit('proctoring:student_disqualified', {
          contestId,
          userId,
          name: userName || 'Student',
          userName: userName || 'Student',
          teamName: teamName || userName || 'Team',
          email: email || '',
          blurCount: blurCount || maxAllowed,
          reason: payload.disqualificationReason,
          timestamp: new Date()
        });
      }
    });

    // Admin broadcasts timer adjustment to contest room (Authorized Admin Only)
    socket.on('admin:timer_sync', (data) => {
      if (!isSocketAdmin()) return;
      const { contestId, remainingSecs, extraMinutes } = data || {};
      if (contestId) {
        emitTimerSync(contestId, remainingSecs, extraMinutes);
      }
    });

    // Admin broadcasts end contest / force submit (Authorized Admin Only)
    socket.on('admin:end_contest', (data) => {
      if (!isSocketAdmin()) return;
      const { contestId } = data || {};
      if (contestId) {
        emitContestEnded(contestId);
      }
    });

    // Admin triggers manual student disqualification (Authorized Admin Only)
    socket.on('admin:disqualify_student', (data) => {
      if (!isSocketAdmin()) return;
      const { contestId, userId, userName, teamName, email, reason } = data || {};
      const payload = {
        contestId,
        userId,
        name: userName || 'Student',
        userName: userName || 'Student',
        teamName: teamName || userName || 'Team',
        email: email || '',
        reason: reason || 'Disqualified by Administrator for integrity violations',
        timestamp: new Date()
      };
      if (userId) {
        io.to(`user_${userId}`).emit('user:disqualified', payload);
      }
      io.to('admin_proctoring').emit('proctoring:student_disqualified', payload);
    });

    // Admin triggers student qualification / reinstatement (Authorized Admin Only)
    socket.on('admin:qualify_student', (data) => {
      if (!isSocketAdmin()) return;
      const { contestId, userId, userName, teamName, note } = data || {};
      const payload = {
        contestId,
        userId,
        name: userName || 'Student',
        userName: userName || 'Student',
        teamName: teamName || userName || 'Team',
        note: note || 'Reinstated & Qualified by Administrator',
        timestamp: new Date()
      };
      if (userId) {
        io.to(`user_${userId}`).emit('user:qualified', payload);
      }
      io.to('admin_proctoring').emit('proctoring:student_qualified', payload);
    });

    socket.on('disconnect', () => {
      // Client disconnected
    });
  });

  console.log('Socket.IO Gateway initialized successfully');
  return io;
};

const getIO = () => {
  return io;
};

// Broadcasts real-time leaderboard update to everyone in the contest room
const emitLeaderboardUpdate = (contestId, data = null) => {
  if (!io) return;
  if (contestId) {
    io.to(`contest_${contestId}`).emit('leaderboard:update', { contestId, data, timestamp: new Date() });
  }
  // Also notify global leaderboard listeners
  io.emit('leaderboard:global_update', { contestId, timestamp: new Date() });
};

// Broadcasts proctoring violation to admin dashboard
const emitToProctoring = (event, payload) => {
  if (!io) return;
  io.to('admin_proctoring').emit(event, { ...payload, timestamp: new Date() });
};

// Broadcasts private event to specific user room (e.g. disqualification, kick)
const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  io.to(`user_${userId}`).emit(event, { ...payload, timestamp: new Date() });
};

// Broadcasts contest timer sync or time extension scoped to contest room
const emitTimerSync = (contestId, remainingSecs, extraMinutes = 0, altId = null) => {
  if (!io || !contestId) return;
  const cId = String(contestId);
  const payload = {
    contestId: cId,
    remainingSecs,
    extraMinutes: extraMinutes || 0,
    timestamp: new Date()
  };
  io.to(`contest_${cId}`).emit('contest:timer_sync', payload);
  if (altId && String(altId) !== cId) {
    io.to(`contest_${String(altId)}`).emit('contest:timer_sync', payload);
  }
};

// Broadcasts contest ended / force submit scoped to target contest room
const emitContestEnded = (contestId, altId = null) => {
  if (!io || !contestId) return;
  const cId = String(contestId);
  const payload = { contestId: cId, timestamp: new Date() };
  const timerPayload = { contestId: cId, remainingSecs: 0, extraMinutes: 0, timestamp: new Date() };

  io.to(`contest_${cId}`).emit('contest:force_submit', payload);
  io.to(`contest_${cId}`).emit('contest:ended', payload);
  io.to(`contest_${cId}`).emit('contest:timer_sync', timerPayload);

  if (altId && String(altId) !== cId) {
    const aId = String(altId);
    io.to(`contest_${aId}`).emit('contest:force_submit', payload);
    io.to(`contest_${aId}`).emit('contest:ended', payload);
    io.to(`contest_${aId}`).emit('contest:timer_sync', timerPayload);
  }
};

module.exports = {
  init,
  getIO,
  emitLeaderboardUpdate,
  emitToProctoring,
  emitToUser,
  emitTimerSync,
  emitContestEnded
};
