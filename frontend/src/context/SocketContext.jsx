import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const getSocketServerUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('/api', '');
  }
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:5000`;
  }
  return 'http://0.0.0.0:5000';
};

const SOCKET_SERVER_URL = getSocketServerUrl();

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const lastJoinedContestRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('⚡ Connected to CodeArena Real-Time WebSocket Server:', socket.id);
      setIsConnected(true);
      // Auto re-join contest room on reconnection if previously joined
      if (lastJoinedContestRef.current) {
        socket.emit('join_contest', lastJoinedContestRef.current);
      }
    });

    socket.on('server:instance', ({ instanceId }) => {
      if (!instanceId) return;
      const storedInstanceId = sessionStorage.getItem('codearena_server_instance_id');
      if (storedInstanceId && storedInstanceId !== instanceId) {
        console.warn('⚡ Server restart detected via WebSocket. Logging out and redirecting to landing...');
        sessionStorage.setItem('codearena_server_instance_id', instanceId);
        sessionStorage.removeItem('codearena_token');
        sessionStorage.removeItem('codearena_user');
        localStorage.removeItem('codearena_token');
        localStorage.removeItem('codearena_user');
        sessionStorage.removeItem('codearena_current_tab');
        window.dispatchEvent(new CustomEvent('codearena:logout', { detail: { reason: 'server_restart' } }));
      } else {
        sessionStorage.setItem('codearena_server_instance_id', instanceId);
      }
    });

    socket.on('disconnect', () => {
      console.log('⚠️ Disconnected from CodeArena WebSocket Server');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('WebSocket connection error (falling back to HTTP):', err.message);
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinContest = (contestId, userData = {}) => {
    const payload = {
      contestId: String(contestId),
      ...userData
    };
    lastJoinedContestRef.current = payload;
    if (socketRef.current && contestId) {
      socketRef.current.emit('join_contest', payload);
    }
  };

  const joinAdminProctoring = () => {
    if (socketRef.current) {
      socketRef.current.emit('join_admin_proctoring');
    }
  };

  const emitBlurEvent = (payload) => {
    if (socketRef.current) {
      socketRef.current.emit('student:blur_event', payload);
    }
  };

  const emitDisqualify = (payload) => {
    if (socketRef.current) {
      socketRef.current.emit('admin:disqualify_student', payload);
    }
  };

  const emitQualify = (payload) => {
    if (socketRef.current) {
      socketRef.current.emit('admin:qualify_student', payload);
    }
  };

  const emitTimerSync = (payload) => {
    if (socketRef.current) {
      socketRef.current.emit('admin:timer_sync', payload);
    }
  };

  const emitEndContest = (payload) => {
    if (socketRef.current) {
      socketRef.current.emit('admin:end_contest', payload);
    }
  };

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      isConnected,
      joinContest,
      joinAdminProctoring,
      emitBlurEvent,
      emitDisqualify,
      emitQualify,
      emitTimerSync,
      emitEndContest
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  return context || {};
};
