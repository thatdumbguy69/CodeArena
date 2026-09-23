import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Shield } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { AdminNotificationDrawer } from '../../components/admin/AdminNotificationDrawer';
import { AdminPushToast } from '../../components/admin/AdminPushToast';
import { DashboardSection } from './sections/DashboardSection';
import { ContestsSection } from './sections/ContestsSection';
import { ProblemBankSection } from './sections/ProblemBankSection';
import { ParticipantsSection } from './sections/ParticipantsSection';
import { LiveProctoringSection } from './sections/LiveProctoringSection';
import { ResultsReportsSection } from './sections/ResultsReportsSection';
import { UserManagementSection } from './sections/UserManagementSection';
import { SettingsSection } from './sections/SettingsSection';
import { SubmissionsSection } from './sections/SubmissionsSection';
import { ContestWorkspace } from './ContestWorkspace';
import { ConfirmActionModal } from '../../components/admin/modals/ConfirmActionModal';
import { AboutCodeArenaSection } from '../../components/common/AboutCodeArenaSection';

// Web Audio API Synth Alert Chime for Real-Time Disqualification Alerts
const playDisqualificationChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.12); // C5
    osc.frequency.setValueAtTime(440.00, ctx.currentTime + 0.24); // A4
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
};

export const AdminPortal = ({
  setCurrentTab,
  setSelectedContestAnalytics,
  setEditingProblem,
  setEditingContest
}) => {
  const { user, logout } = useAuth();
  const { socket, joinAdminProctoring } = useSocket();
  const [liveViolationCount, setLiveViolationCount] = useState(0);

  // Live Notifications & Floating Push Toasts
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = sessionStorage.getItem('codearena_admin_live_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [toasts, setToasts] = useState([]);

  // Navigation & Workspace State (Persisted within active browser tab session)
  const [activeSection, setActiveSection] = useState(() => {
    try {
      return sessionStorage.getItem('codearena_admin_activeSection') || 'dashboard';
    } catch (e) {
      return 'dashboard';
    }
  });

  const [activeWorkspaceContest, setActiveWorkspaceContest] = useState(() => {
    try {
      const saved = sessionStorage.getItem('codearena_admin_activeWorkspaceContest');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Contest across Submissions & Results/Reports (Persisted across tab switches and session)
  const [selectedAdminContestId, setSelectedAdminContestId] = useState(() => {
    try {
      return sessionStorage.getItem('codearena_admin_selected_contest') || 'global';
    } catch (e) {
      return 'global';
    }
  });

  const handleSelectAdminContest = (contestId) => {
    if (!contestId) return;
    setSelectedAdminContestId(contestId);
    try {
      sessionStorage.setItem('codearena_admin_selected_contest', contestId);
    } catch (e) {}
  };

  const [aboutSubTab, setAboutSubTab] = useState(() => {
    try {
      return sessionStorage.getItem('codearena_admin_aboutSubTab') || 'home';
    } catch (e) {
      return 'home';
    }
  });

  const handleSelectAboutSubTab = (sub) => {
    setAboutSubTab(sub);
    try {
      sessionStorage.setItem('codearena_admin_aboutSubTab', sub);
    } catch (e) {}
  };

  useEffect(() => {
    try {
      if (activeSection) sessionStorage.setItem('codearena_admin_activeSection', activeSection);
    } catch (e) {}
  }, [activeSection]);

  useEffect(() => {
    try {
      if (activeWorkspaceContest) {
        sessionStorage.setItem('codearena_admin_activeWorkspaceContest', JSON.stringify(activeWorkspaceContest));
      } else {
        sessionStorage.removeItem('codearena_admin_activeWorkspaceContest');
      }
    } catch (e) {}
  }, [activeWorkspaceContest]);

  // Platform Data with Instant SWR Session Cache for 0ms delay rendering
  const [analytics, setAnalytics] = useState(() => {
    try {
      const s = sessionStorage.getItem('codearena_admin_analytics');
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  });
  const [questions, setQuestions] = useState(() => {
    try {
      const s = sessionStorage.getItem('codearena_admin_questions');
      return s ? JSON.parse(s) : [];
    } catch (e) { return []; }
  });
  const [contests, setContests] = useState(() => {
    try {
      const s = sessionStorage.getItem('codearena_admin_contests');
      return s ? JSON.parse(s) : [];
    } catch (e) { return []; }
  });
  const [usersList, setUsersList] = useState(() => {
    try {
      const s = sessionStorage.getItem('codearena_admin_usersList');
      return s ? JSON.parse(s) : [];
    } catch (e) { return []; }
  });
  const [submissions, setSubmissions] = useState(() => {
    try {
      const s = sessionStorage.getItem('codearena_admin_submissions');
      return s ? JSON.parse(s) : [];
    } catch (e) { return []; }
  });
  const [initialLoading, setInitialLoading] = useState(() => {
    try {
      return !sessionStorage.getItem('codearena_admin_suite_loaded');
    } catch (e) {
      return false;
    }
  });
  const [loadStep, setLoadStep] = useState(0);

  // Modal State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const lastFetchTimeRef = useRef(0);
  const disqualifiedUsersRef = useRef(new Set());

  // Unified Data Loader with 0ms UI delay (Loads from session cache instantly, updates in background) entry
  const fetchData = useCallback(async (isInitial = false) => {
    try {
      lastFetchTimeRef.current = Date.now();
      if (isInitial) {
        setInitialLoading(true);
        setLoadStep(0);
      }

      // Minimum smooth animation timer for clean transition
      const minTimer = isInitial
        ? new Promise((resolve) => {
            const t1 = setTimeout(() => setLoadStep(1), 500);
            const t2 = setTimeout(() => setLoadStep(2), 1000);
            const t3 = setTimeout(() => setLoadStep(3), 1600);
            const t4 = setTimeout(() => {
              setLoadStep(4);
              resolve();
            }, 2100);
          })
        : Promise.resolve();

      // Parallel fetch of all 5 critical admin collections
      const [analyticsRes, qRes, cRes, subRes, uRes] = await Promise.all([
        api.get('/leaderboard/admin-analytics').catch(() => ({ data: null })),
        api.get('/questions').catch(() => ({ data: { questions: [] } })),
        api.get('/contests').catch(() => ({ data: { contests: [] } })),
        api.get('/submissions').catch(() => ({ data: { submissions: [] } })),
        api.get('/auth/users').catch(() => ({ data: { users: [] } })),
        minTimer
      ]);

      if (analyticsRes.data) {
        setAnalytics(analyticsRes.data);
        try { sessionStorage.setItem('codearena_admin_analytics', JSON.stringify(analyticsRes.data)); } catch (e) {}
      }
      if (qRes.data?.questions) {
        setQuestions(qRes.data.questions);
        try { sessionStorage.setItem('codearena_admin_questions', JSON.stringify(qRes.data.questions)); } catch (e) {}
      }
      if (cRes.data?.contests) {
        setContests(cRes.data.contests);
        try { sessionStorage.setItem('codearena_admin_contests', JSON.stringify(cRes.data.contests)); } catch (e) {}
      }
      if (subRes.data?.submissions) {
        setSubmissions(subRes.data.submissions);
        try { sessionStorage.setItem('codearena_admin_submissions', JSON.stringify(subRes.data.submissions)); } catch (e) {}
      }
      if (uRes.data?.users) {
        setUsersList(uRes.data.users);
        try { sessionStorage.setItem('codearena_admin_usersList', JSON.stringify(uRes.data.users)); } catch (e) {}
      }

    } catch (err) {
      console.error('Error loading admin portal data:', err);
    } finally {
      if (isInitial) {
        try {
          sessionStorage.setItem('codearena_admin_suite_loaded', 'true');
        } catch (e) {}
        setTimeout(() => setInitialLoading(false), 200);
      }
    }
  }, []);

  // Real-Time Socket Proctoring Violation Tracking & Live Push Notifications
  useEffect(() => {
    if (!socket) return;

    if (typeof joinAdminProctoring === 'function') {
      joinAdminProctoring();
    } else {
      socket.emit('join_admin_proctoring');
    }

    const handleStudentDisqualified = (data = {}) => {
      const candidateKey = String(data.userId || data.email || data.name || 'anon') + '_' + String(data.contestId || 'global');
      if (disqualifiedUsersRef.current.has(candidateKey)) {
        return; // Prevent duplicate notifications for the same candidate
      }
      disqualifiedUsersRef.current.add(candidateKey);

      playDisqualificationChime();

      const candidateName = data.name || data.userName || 'Participant';
      const reasonText = data.reason || `Participant ${candidateName} was disqualified for integrity violations.`;

      const disqNotif = {
        id: 'notif_disq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        type: 'disqualification',
        severity: 'danger',
        title: 'Participant Disqualified',
        studentName: candidateName,
        teamName: data.teamName || '',
        email: data.email || '',
        contestId: data.contestId,
        message: reasonText,
        timestamp: new Date().toISOString()
      };

      setNotifications(prev => {
        const next = [disqNotif, ...prev.slice(0, 49)];
        try { sessionStorage.setItem('codearena_admin_live_notifications', JSON.stringify(next)); } catch (e) {}
        return next;
      });

      // Show live floating push toast
      setToasts(prev => [disqNotif, ...prev.slice(0, 3)]);

      // Auto-dismiss toast after 8.5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== disqNotif.id));
      }, 8500);
    };

    const handleViolation = (data = {}) => {
      setLiveViolationCount(prev => prev + 1);

      if (data?.isDisqualified) {
        handleStudentDisqualified(data);
      } else if (data?.blurCount) {
        const violNotif = {
          id: 'notif_viol_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          type: 'violation',
          severity: 'warning',
          title: 'Integrity Violation Alert',
          studentName: data.name || data.userName || 'Participant',
          teamName: data.teamName || '',
          email: data.email || '',
          contestId: data.contestId,
          message: `${data.name || 'Participant'} switched tabs (Warning ${data.blurCount}/${data.maxAllowedBlurs || 2}).`,
          timestamp: new Date().toISOString()
        };

        setNotifications(prev => {
          const next = [violNotif, ...prev.slice(0, 49)];
          try { sessionStorage.setItem('codearena_admin_live_notifications', JSON.stringify(next)); } catch (e) {}
          return next;
        });
      }
    };

    const handleUserActivity = () => {
      api.get('/auth/users')
        .then(res => {
          if (res.data?.users) {
            setUsersList(res.data.users);
            try { sessionStorage.setItem('codearena_admin_usersList', JSON.stringify(res.data.users)); } catch (e) {}
          }
        })
        .catch(() => {});
    };

    const handleUserDeleted = ({ userId } = {}) => {
      if (userId) {
        setUsersList(prev => {
          const next = prev.filter(u => String(u._id || u.id) !== String(userId));
          try { sessionStorage.setItem('codearena_admin_usersList', JSON.stringify(next)); } catch (e) {}
          return next;
        });
        setSubmissions(prev => {
          const next = prev.filter(s => String(s.user) !== String(userId));
          try { sessionStorage.setItem('codearena_admin_submissions', JSON.stringify(next)); } catch (e) {}
          return next;
        });
      }
    };

    const handleBulkDeleted = () => {
      fetchData(false);
    };

    const handleSubmissionsPurged = () => {
      setSubmissions([]);
      try { sessionStorage.removeItem('codearena_admin_submissions'); } catch (e) {}
      fetchData(false);
    };

    const handleContestEnded = (data) => {
      const endedId = String(data?.contestId || '');
      setContests(prev =>
        prev.map(c => {
          if (!endedId || String(c._id || c.id || c.slug) === endedId) {
            return { ...c, status: 'Ended', remainingSecs: 0 };
          }
          return c;
        })
      );
      fetchData(false);
    };

    const handleContestPublished = (data) => {
      const newOrUpdated = data?.contest;
      if (newOrUpdated) {
        setContests(prev => {
          const exists = prev.some(c => String(c._id || c.id || c.slug) === String(newOrUpdated._id || newOrUpdated.id || newOrUpdated.slug));
          if (exists) {
            return prev.map(c => String(c._id || c.id || c.slug) === String(newOrUpdated._id || newOrUpdated.id || newOrUpdated.slug) ? newOrUpdated : c);
          }
          return [newOrUpdated, ...prev];
        });
      }
      fetchData(false);
    };

    socket.on('proctoring:student_disqualified', handleStudentDisqualified);
    socket.on('proctoring:violation', handleViolation);
    socket.on('user:registered', handleUserActivity);
    socket.on('user:login', handleUserActivity);
    socket.on('proctoring:student_joined', handleUserActivity);
    socket.on('user:deleted', handleUserDeleted);
    socket.on('users:bulk_deleted', handleBulkDeleted);
    socket.on('submissions:purged', handleSubmissionsPurged);
    socket.on('contest:ended', handleContestEnded);
    socket.on('contest:published', handleContestPublished);
    socket.on('contest:global_refresh', () => fetchData(false));
    socket.on('leaderboard:global_update', () => fetchData(false));

    return () => {
      socket.off('proctoring:student_disqualified', handleStudentDisqualified);
      socket.off('proctoring:violation', handleViolation);
      socket.off('user:registered', handleUserActivity);
      socket.off('user:login', handleUserActivity);
      socket.off('proctoring:student_joined', handleUserActivity);
      socket.off('user:deleted', handleUserDeleted);
      socket.off('users:bulk_deleted', handleBulkDeleted);
      socket.off('submissions:purged', handleSubmissionsPurged);
      socket.off('contest:ended', handleContestEnded);
      socket.off('contest:published', handleContestPublished);
      socket.off('contest:global_refresh');
      socket.off('leaderboard:global_update');
    };
  }, [socket, fetchData, joinAdminProctoring]);

  useEffect(() => {
    const isFirstTimeAdminLoad = !sessionStorage.getItem('codearena_admin_suite_loaded');
    fetchData(isFirstTimeAdminLoad);
  }, [fetchData]);

  // Throttled background sync on section change
  useEffect(() => {
    const now = Date.now();
    if (now - lastFetchTimeRef.current > 4000) {
      fetchData(false);
    }
  }, [activeSection, fetchData]);

  // Window Focus Auto-Sync
  useEffect(() => {
    const handleFocus = () => {
      if (!document.hidden) {
        const now = Date.now();
        if (now - lastFetchTimeRef.current > 4000) {
          fetchData(false);
        }
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchData]);

  // Continuous 1-Second Timer Tick for Real-Time Contest Countdown in Admin View
  useEffect(() => {
    const timer = setInterval(() => {
      setContests(prevContests => {
        if (!prevContests || prevContests.length === 0) return prevContests;
        let changed = false;
        const updated = prevContests.map(c => {
          let secs = c.remainingSecs;
          if (c.endTime) {
            const nowMs = Date.now();
            const endMs = new Date(c.endTime).getTime();
            secs = Math.max(0, Math.floor((endMs - nowMs) / 1000));
          } else if (secs !== undefined && secs > 0) {
            secs = secs - 1;
          }

          if (secs !== c.remainingSecs) {
            changed = true;
            return {
              ...c,
              remainingSecs: secs,
              status: secs <= 0 ? 'Ended' : (c.status === 'Ended' ? 'Ended' : c.status)
            };
          }
          return c;
        });

        return changed ? updated : prevContests;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOpenWorkspace = (contestObj) => {
    setActiveWorkspaceContest(contestObj);
    if (setSelectedContestAnalytics) setSelectedContestAnalytics(contestObj._id || contestObj.id);
  };

  const handleHostNewContest = () => {
    if (setEditingContest) setEditingContest(null);
    if (setCurrentTab) setCurrentTab('host-contest');
  };

  const handleEditContest = (contestObj) => {
    if (setEditingContest) setEditingContest(contestObj);
    if (setCurrentTab) setCurrentTab('host-contest');
  };

  const handleEndContest = async (contestId) => {
    setConfirmModal({
      isOpen: true,
      title: 'End Contest Immediately',
      message: 'Are you sure you want to end this contest immediately? All participant workspaces will automatically evaluate and submit solutions.',
      confirmText: 'End Contest Now',
      danger: true,
      onConfirm: async () => {
        try {
          await api.put(`/contests/${contestId}`, { status: 'Ended', remainingSecs: 0 });
          fetchData(false);
        } catch (err) {
          alert('Error ending contest');
        }
      }
    });
  };

  const handleDeleteContest = async (contestId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Contest',
      message: 'Are you sure you want to permanently delete this contest? All participant session data and rankings for this contest will be removed.',
      confirmText: 'Delete Contest',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/contests/${contestId}`);
          setContests(prev => prev.filter(c => String(c._id) !== String(contestId) && String(c.id) !== String(contestId) && c.slug !== contestId));
          if (activeWorkspaceContest && (String(activeWorkspaceContest._id) === String(contestId) || String(activeWorkspaceContest.id) === String(contestId) || activeWorkspaceContest.slug === contestId)) {
            setActiveWorkspaceContest(null);
          }
          await fetchData(false);
        } catch (err) {
          console.error('Error deleting contest:', err);
          alert(err.response?.data?.message || 'Error deleting contest');
        }
      }
    });
  };

  const handleDeleteProblem = async (problemId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Problem Statement',
      message: 'Are you sure you want to delete this problem statement from the problem bank?',
      confirmText: 'Delete Problem',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/questions/${problemId}`);
          fetchData(false);
        } catch (err) {
          alert('Error deleting problem');
        }
      }
    });
  };

  const handleDeleteUser = async (userId) => {
    try {
      await api.delete(`/auth/users/${userId}`);
      setUsersList(prev => prev.filter(u => String(u._id || u.id) !== String(userId)));
      fetchData(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error removing user');
    }
  };

  const handleDeleteAllStudents = async () => {
    try {
      await api.delete('/auth/users/all-students');
      setUsersList(prev => prev.filter(u => u.role === 'admin'));
      setSubmissions([]);
      fetchData(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting all students');
    }
  };

  const handleCreateUser = (newUser) => {
    if (newUser) {
      setUsersList(prev => [newUser, ...prev]);
      fetchData(false);
    }
  };

  const handleDeleteAllSubmissions = async () => {
    try {
      await api.delete('/submissions/purge');
      setSubmissions([]);
      try { sessionStorage.removeItem('codearena_admin_submissions'); } catch (e) {}
      fetchData(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error purging submissions');
    }
  };

  const handleDeleteSubmission = async (subId) => {
    try {
      await api.delete(`/submissions/${subId}`);
      setSubmissions(prev => prev.filter(s => String(s._id || s.id) !== String(subId)));
      fetchData(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting submission');
    }
  };

  const handleDisqualifyParticipant = async (userId) => {
    const liveContest = contests.find(c => c.status === 'Live' || c.remainingSecs > 0);
    if (!liveContest) {
      alert('No active live contest found to disqualify candidate.');
      return;
    }
    try {
      await api.post(`/contests/${liveContest._id || liveContest.id}/disqualify`, { userId });
      fetchData(false);
    } catch (err) {
      alert('Error disqualifying participant');
    }
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
    try { sessionStorage.removeItem('codearena_admin_live_notifications'); } catch (e) {}
  };

  const handleDismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleToastAction = () => {
    setActiveWorkspaceContest(null);
    setActiveSection('live-proctoring');
  };

  const sectionTitles = {
    'dashboard': 'SMD TABRAIZ ADMIN Dashboard',
    'contests': 'Contest Management',
    'problem-bank': 'Problem Bank',
    'submissions': 'Centralized Code Submissions Log',
    'participants': 'Participant Directory',
    'live-proctoring': 'Live Proctoring',
    'results-reports': 'Results & Reports',
    'user-management': 'User Management',
    'settings': 'Settings',
    'about': 'About CodeArena'
  };

  const liveContest = contests.find(c => c.status === 'Live' || c.remainingSecs > 0);

  // Light-themed simple loading transition
  if (initialLoading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-paper)',
        color: 'var(--text-ink)',
        fontFamily: 'IBM Plex Sans, -apple-system, BlinkMacSystemFont, sans-serif',
        padding: '2rem',
        boxSizing: 'border-box',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '2.5rem',
          maxWidth: '420px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.06), 0 4px 6px -2px rgba(0, 0, 0, 0.03)'
        }}>
          {/* Simple Clean Spinner */}
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #E2E8F0',
            borderTop: '3px solid var(--accent-blue)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '1.25rem'
          }} />

          <h3 style={{
            fontSize: '1.2rem',
            fontWeight: 800,
            color: 'var(--text-ink)',
            margin: '0 0 0.4rem 0'
          }}>
            Loading Admin Suite
          </h3>

          <div style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginBottom: '1.5rem',
            minHeight: '20px',
            fontWeight: 500
          }}>
            {loadStep === 0 && 'Connecting to admin server...'}
            {loadStep === 1 && 'Syncing contests & proctoring data...'}
            {loadStep === 2 && 'Fetching problem bank & submissions...'}
            {loadStep === 3 && 'Compiling participant analytics...'}
            {loadStep >= 4 && 'Opening dashboard...'}
          </div>

          {/* Simple Progress Bar */}
          <div style={{
            width: '100%',
            height: '5px',
            background: '#E2E8F0',
            borderRadius: '999px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, Math.max(20, (loadStep + 1) * 22))}%`,
              background: 'var(--accent-blue)',
              borderRadius: '999px',
              transition: 'width 0.35s ease-in-out'
            }} />
          </div>

          <div style={{
            marginTop: '1.25rem',
            fontSize: '0.75rem',
            color: 'var(--text-slate)',
            fontWeight: 500
          }}>
            SMD TABRAIZ Administrator Session
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-portal-wrapper" style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-paper)',
      fontFamily: 'IBM Plex Sans, sans-serif'
    }}>
      {/* 1. Persistent Sidebar */}
      <AdminSidebar
        activeSection={activeSection}
        setActiveSection={(sec) => {
          setActiveSection(sec);
          setActiveWorkspaceContest(null);
        }}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        liveContestActive={!!liveContest}
        activeWorkspaceContest={activeWorkspaceContest}
        onOpenWorkspace={handleOpenWorkspace}
        liveContest={liveContest}
        contests={contests}
        violationCount={liveViolationCount}
        aboutSubTab={aboutSubTab}
        onSelectAboutSubTab={handleSelectAboutSubTab}
      />

      {/* Main Container Area */}
      <div style={{
        flex: 1,
        marginLeft: collapsed ? '72px' : '260px',
        transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }}>
        {/* 2. Global Header */}
        <AdminHeader
          activeSectionTitle={activeWorkspaceContest ? `Contest Workspace: ${activeWorkspaceContest.title}` : sectionTitles[activeSection]}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onToggleMobileNav={() => setMobileOpen(!mobileOpen)}
          onToggleNotifications={() => setNotificationsOpen(!notificationsOpen)}
          notificationCount={notifications.length}
          liveContest={liveContest}
          onSignOut={logout}
          onOpenLiveContest={handleOpenWorkspace}
        />

        {/* 3. Section Content Body */}
        <main style={{ padding: '1.25rem 1.5rem', flex: 1, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
          {activeWorkspaceContest ? (
            <ContestWorkspace
              contestId={activeWorkspaceContest._id || activeWorkspaceContest.id}
              onBack={() => setActiveWorkspaceContest(null)}
              setEditingContest={setEditingContest}
              setEditingProblem={setEditingProblem}
              setCurrentTab={setCurrentTab}
              currentUser={user}
            />
          ) : (
            <>
              {activeSection === 'dashboard' && (
                <DashboardSection
                  analytics={analytics}
                  contests={contests}
                  questions={questions}
                  usersList={usersList}
                  submissions={submissions}
                  onOpenWorkspace={handleOpenWorkspace}
                  onNavigateSection={setActiveSection}
                  onOpenConfirmModal={setConfirmModal}
                  onEndContest={handleEndContest}
                />
              )}

              {activeSection === 'contests' && (
                <ContestsSection
                  contests={contests}
                  onOpenWorkspace={handleOpenWorkspace}
                  onHostNewContest={handleHostNewContest}
                  onEditContest={handleEditContest}
                  onDeleteContest={handleDeleteContest}
                  onEndContest={handleEndContest}
                />
              )}

              {activeSection === 'problem-bank' && (
                <ProblemBankSection
                  questions={questions}
                  onRefreshData={fetchData}
                  onDeleteProblem={handleDeleteProblem}
                />
              )}

              {activeSection === 'submissions' && (
                <SubmissionsSection
                  submissions={submissions}
                  contests={contests}
                  selectedContestId={selectedAdminContestId}
                  onSelectContest={handleSelectAdminContest}
                  onDeleteAllSubmissions={handleDeleteAllSubmissions}
                  onDeleteSubmission={handleDeleteSubmission}
                />
              )}

              {activeSection === 'live-proctoring' && (
                <LiveProctoringSection
                  contests={contests}
                  usersList={usersList}
                  onDisqualifyParticipant={handleDisqualifyParticipant}
                />
              )}

              {activeSection === 'results-reports' && (
                <ResultsReportsSection
                  contests={contests}
                  analytics={analytics}
                  currentUser={user}
                  selectedContestId={selectedAdminContestId}
                  onSelectContest={handleSelectAdminContest}
                  onViewSubmissions={(targetContestId) => {
                    if (targetContestId) {
                      handleSelectAdminContest(targetContestId);
                    }
                    setActiveWorkspaceContest(null);
                    setActiveSection('submissions');
                  }}
                />
              )}

              {activeSection === 'user-management' && (
                <UserManagementSection
                  usersList={usersList}
                  currentUser={user}
                  onDeleteUser={handleDeleteUser}
                  onDeleteAllStudents={handleDeleteAllStudents}
                  onUserCreated={handleCreateUser}
                />
              )}

              {activeSection === 'settings' && (
                <SettingsSection currentUser={user} />
              )}

              {activeSection === 'about' && (
                <AboutCodeArenaSection
                  activeSubTab={aboutSubTab}
                  onSelectSubTab={handleSelectAboutSubTab}
                  setCurrentTab={setCurrentTab}
                  onNavigatePortalTab={(targetTab) => {
                    setActiveWorkspaceContest(null);
                    if (targetTab === 'problems' || targetTab === 'practice') {
                      setActiveSection('problem-bank');
                    } else if (targetTab === 'contests' || targetTab === 'contest') {
                      setActiveSection('contests');
                    } else if (targetTab === 'leaderboard' || targetTab === 'results') {
                      setActiveSection('results-reports');
                    } else if (targetTab === 'submissions') {
                      setActiveSection('submissions');
                    } else {
                      setActiveSection('dashboard');
                    }
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Floating Live Push Alerts */}
      <AdminPushToast
        toasts={toasts}
        onDismiss={handleDismissToast}
        onAction={handleToastAction}
      />

      {/* Drawers & Confirmation Modals */}
      <AdminNotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onClearAll={handleClearAllNotifications}
        onNavigateSection={setActiveSection}
      />

      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false })}
        onConfirm={confirmModal.onConfirm || (() => {})}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        danger={confirmModal.danger !== false}
        requireTypedConfirmation={confirmModal.requireTypedConfirmation || false}
        confirmationKeyword={confirmModal.confirmationKeyword || 'CONFIRM'}
      />
    </div>
  );
};
