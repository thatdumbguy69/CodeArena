const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const { REDIS_CONFIG, getIsRedisAvailable } = require('../config/redis');

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

  io.on('connection', (socket) => {
    // Participant / Client joins a contest room & user room
    socket.on('join_contest', (data) => {
      const { contestId, userId, userName, teamName, email } = data || {};
      if (contestId) {
        socket.join(`contest_${contestId}`);
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
    socket.on('join_admin_proctoring', () => {
      socket.join('admin_proctoring');
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

    // Admin broadcasts timer adjustment to contest room
    socket.on('admin:timer_sync', (data) => {
      const { contestId, remainingSecs, extraMinutes } = data || {};
      if (contestId) {
        const payload = {
          contestId,
          remainingSecs,
          extraMinutes: extraMinutes || 0,
          timestamp: new Date()
        };
        io.to(`contest_${contestId}`).emit('contest:timer_sync', payload);
        io.emit('contest:timer_sync', payload);
      }
    });

    // Admin broadcasts end contest / force submit
    socket.on('admin:end_contest', (data) => {
      const { contestId } = data || {};
      if (contestId) {
        io.to(`contest_${contestId}`).emit('contest:force_submit', {
          contestId,
          timestamp: new Date()
        });
        io.emit('contest:ended', { contestId });
      }
    });

    // Admin triggers manual student disqualification
    socket.on('admin:disqualify_student', (data) => {
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

    // Admin triggers student qualification / reinstatement
    socket.on('admin:qualify_student', (data) => {
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

// Broadcasts contest timer sync or time extension
const emitTimerSync = (contestId, remainingSecs, extraMinutes = 0) => {
  if (!io || !contestId) return;
  const payload = {
    contestId,
    remainingSecs,
    extraMinutes: extraMinutes || 0,
    timestamp: new Date()
  };
  io.to(`contest_${contestId}`).emit('contest:timer_sync', payload);
  io.emit('contest:timer_sync', payload);
};

// Broadcasts contest ended / force submit to all participants in contest
const emitContestEnded = (contestId) => {
  if (!io || !contestId) return;
  io.to(`contest_${contestId}`).emit('contest:force_submit', {
    contestId,
    timestamp: new Date()
  });
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
