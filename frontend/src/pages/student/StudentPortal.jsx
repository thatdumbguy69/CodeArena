import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { StudentSidebar } from '../../components/student/StudentSidebar';
import { StudentHeader } from '../../components/student/StudentHeader';
import { StudentDashboardSection } from './sections/StudentDashboardSection';
import { StudentPracticeSection } from './sections/StudentPracticeSection';
import { StudentContestsSection } from './sections/StudentContestsSection';
import { StudentSubmissionsSection } from './sections/StudentSubmissionsSection';
import { StudentLeaderboardSection } from './sections/StudentLeaderboardSection';
import { StudentProfileSection } from './sections/StudentProfileSection';
import { StudentProblemWorkspace } from './StudentProblemWorkspace';

export const StudentPortal = ({
  initialTab = 'dashboard',
  onSelectProblemExternal
}) => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();

  // Navigation & Layout State (Persisted within active browser tab session)
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return sessionStorage.getItem('codearena_student_activeTab') || initialTab || 'dashboard';
    } catch (e) {
      return initialTab || 'dashboard';
    }
  });

  const [activeProblemSlug, setActiveProblemSlug] = useState(() => {
    try {
      return sessionStorage.getItem('codearena_student_activeProblemSlug') || null;
    } catch (e) {
      return null;
    }
  });

  const [activeContest, setActiveContest] = useState(() => {
    try {
      const saved = sessionStorage.getItem('codearena_student_activeContest');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [leaderboardContestId, setLeaderboardContestId] = useState(null);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      if (activeTab) sessionStorage.setItem('codearena_student_activeTab', activeTab);
    } catch (e) {}
  }, [activeTab]);

  useEffect(() => {
    try {
      if (activeProblemSlug) {
        sessionStorage.setItem('codearena_student_activeProblemSlug', activeProblemSlug);
      } else {
        sessionStorage.removeItem('codearena_student_activeProblemSlug');
      }
    } catch (e) {}
  }, [activeProblemSlug]);

  useEffect(() => {
    try {
      if (activeContest) {
        sessionStorage.setItem('codearena_student_activeContest', JSON.stringify(activeContest));
      } else {
        sessionStorage.removeItem('codearena_student_activeContest');
      }
    } catch (e) {}
  }, [activeContest]);

  // Platform Data
  const [stats, setStats] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [contests, setContests] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const sectionTitles = {
    dashboard: 'Dashboard',
    practice: 'Practice',
    contests: 'Contests',
    submissions: 'Submissions',
    leaderboard: 'Leaderboard',
    profile: 'Profile'
  };

  const fetchStudentPortalData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setInitialLoading(true);
      const [statsRes, qRes, cRes, subRes] = await Promise.all([
        api.get('/leaderboard/student-stats').catch(() => ({ data: null })),
        api.get('/questions').catch(() => ({ data: { questions: [] } })),
        api.get('/contests').catch(() => ({ data: { contests: [] } })),
        api.get('/submissions').catch(() => ({ data: { submissions: [] } }))
      ]);

      const freshStats = statsRes.data || null;
      const freshQuestions = qRes.data.questions || [];
      const freshContests = cRes.data.contests || [];
      const freshSubmissions = subRes.data.submissions || [];

      if (freshStats) setStats(freshStats);
      setQuestions(freshQuestions);
      setContests(freshContests);
      setSubmissions(freshSubmissions);
    } catch (err) {
      console.error('Error fetching student portal data:', err);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchStudentPortalData(true);
  }, [fetchStudentPortalData]);

  // Sync fresh data when switching tabs or window regains visibility
  useEffect(() => {
    fetchStudentPortalData(false);
  }, [activeTab, fetchStudentPortalData]);

  useEffect(() => {
    const handleFocus = () => {
      if (!document.hidden) fetchStudentPortalData(false);
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchStudentPortalData]);

  // Real-time WebSocket Listeners for Instant Broadcast Updates
  useEffect(() => {
    if (!socket) return;

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
      fetchStudentPortalData(false);
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
      fetchStudentPortalData(false);
    };

    const handleTimerSync = (data) => {
      const syncId = String(data?.contestId || '');
      if (data?.remainingSecs !== undefined) {
        setContests(prev => 
          prev.map(c => {
            if (String(c._id || c.id || c.slug) === syncId) {
              return { 
                ...c, 
                remainingSecs: data.remainingSecs, 
                status: data.remainingSecs <= 0 ? 'Ended' : c.status 
              };
            }
            return c;
          })
        );
      }
    };

    const handleGlobalRefresh = () => {
      fetchStudentPortalData(false);
    };

    socket.on('contest:ended', handleContestEnded);
    socket.on('contest:force_submit', handleContestEnded);
    socket.on('contest:published', handleContestPublished);
    socket.on('contest:timer_sync', handleTimerSync);
    socket.on('contest:global_refresh', handleGlobalRefresh);
    socket.on('leaderboard:global_update', handleGlobalRefresh);

    return () => {
      socket.off('contest:ended', handleContestEnded);
      socket.off('contest:force_submit', handleContestEnded);
      socket.off('contest:published', handleContestPublished);
      socket.off('contest:timer_sync', handleTimerSync);
      socket.off('contest:global_refresh', handleGlobalRefresh);
      socket.off('leaderboard:global_update', handleGlobalRefresh);
    };
  }, [socket, fetchStudentPortalData]);

  // Continuous 1-Second Timer Tick for Real-Time Contest Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setContests(prevContests => {
        if (!prevContests || prevContests.length === 0) return prevContests;
        let changed = false;
        const updated = prevContests.map(c => {
          let secs = c.remainingSecs;
          let startsIn = c.startsInSecs;
          const nowMs = Date.now();
          const startMs = c.startTime ? new Date(c.startTime).getTime() : 0;
          const endMs = c.endTime ? new Date(c.endTime).getTime() : (startMs + (c.duration || 60) * 60000);

          if (c.startTime) {
            startsIn = Math.max(0, Math.floor((startMs - nowMs) / 1000));
          }

          if (c.endTime) {
            secs = Math.max(0, Math.floor((endMs - nowMs) / 1000));
          } else if (secs !== undefined && secs > 0) {
            secs = secs - 1;
          }

          let newStatus = c.status;
          if (c.status === 'Ended' || (endMs <= nowMs && startMs <= nowMs)) {
            newStatus = 'Ended';
          } else if (startMs > nowMs) {
            newStatus = 'Upcoming';
          } else {
            newStatus = 'Active';
          }

          if (secs !== c.remainingSecs || startsIn !== c.startsInSecs || newStatus !== c.status) {
            changed = true;
            return {
              ...c,
              remainingSecs: secs,
              startsInSecs: startsIn,
              status: newStatus
            };
          }
          return c;
        });

        return changed ? updated : prevContests;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSelectProblem = (slug) => {
    setActiveProblemSlug(slug);
    setActiveContest(null);
  };

  const handleOpenContest = async (contestObj) => {
    if (!contestObj) return;

    // Trigger browser Fullscreen mode synchronously on user click gesture
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request error:', e);
    }

    const nowMs = Date.now();
    const startMs = contestObj.startTime ? new Date(contestObj.startTime).getTime() : 0;
    const endMs = contestObj.endTime ? new Date(contestObj.endTime).getTime() : Infinity;
    const isUpcoming = contestObj.status === 'Upcoming' || startMs > nowMs;
    const isTrulyEnded = !isUpcoming && (contestObj.status === 'Ended' || endMs <= nowMs);

    if (isTrulyEnded) {
      const cId = contestObj._id || contestObj.id || contestObj.slug;
      if (cId) setLeaderboardContestId(String(cId));
      setActiveProblemSlug(null);
      setActiveContest(null);
      setActiveTab('leaderboard');
      return;
    }

    try {
      const cId = contestObj._id || contestObj.id || contestObj.slug;
      let targetContest = contestObj;

      if (cId) {
        // Start or resume contest session to track official start time
        try {
          await api.post(`/contests/${cId}/session/start`);
        } catch (startErr) {
          if (startErr.response?.status === 403 || startErr.response?.data?.isDisqualified) {
            alert(startErr.response?.data?.message || 'You have been disqualified from this contest. Only an administrator can reinstate your qualification.');
            return;
          }
        }

        const res = await api.get(`/contests/${cId}`).catch(() => null);
        if (res?.data?.contest) {
          targetContest = res.data.contest;
        }
      }

      const tStartMs = targetContest.startTime ? new Date(targetContest.startTime).getTime() : 0;
      const tEndMs = targetContest.endTime ? new Date(targetContest.endTime).getTime() : Infinity;
      const tIsUpcoming = targetContest.status === 'Upcoming' || tStartMs > nowMs;
      const tIsTrulyEnded = !tIsUpcoming && (targetContest.status === 'Ended' || tEndMs <= nowMs);

      if (tIsTrulyEnded) {
        const endedId = targetContest._id || targetContest.id || targetContest.slug;
        if (endedId) setLeaderboardContestId(String(endedId));
        setActiveProblemSlug(null);
        setActiveContest(null);
        setActiveTab('leaderboard');
        return;
      }

      let probs = targetContest.problems || [];
      
      // Fallback: If contest has no assigned problems, fetch questions list or practice questions
      if (probs.length === 0) {
        const qRes = await api.get('/questions').catch(() => null);
        const availQuestions = qRes?.data?.questions || [];
        if (availQuestions.length > 0) {
          probs = availQuestions;
          targetContest = { ...targetContest, problems: availQuestions };
        }
      }

      const firstProb = probs.length > 0 ? probs[0] : null;
      let targetSlugOrId = null;

      if (typeof firstProb === 'string') {
        targetSlugOrId = firstProb;
      } else if (firstProb && typeof firstProb === 'object') {
        targetSlugOrId = firstProb.slug || firstProb._id || firstProb.id;
      }

      if (!targetSlugOrId) {
        targetSlugOrId = 'two-sum';
      }

      setActiveContest(targetContest);
      setActiveProblemSlug(targetSlugOrId);
    } catch (err) {
      console.error('Error entering contest:', err);
      setActiveContest(contestObj);
      setActiveProblemSlug('two-sum');
    }
  };

  const exitBrowserFullscreen = () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      }
    } catch (e) {
      console.warn('Exit fullscreen error:', e);
    }
  };

  const liveContest = contests.find(c => c.status !== 'Ended' && (c.status === 'Live' || c.status === 'Active' || (c.remainingSecs !== undefined && c.remainingSecs > 0)));

  // Active Problem / Contest Workspace View
  if (activeProblemSlug) {
    return (
      <StudentProblemWorkspace
        problemSlug={activeProblemSlug}
        contestMode={!!activeContest}
        contest={activeContest}
        allProblems={questions}
        onBack={() => {
          exitBrowserFullscreen();
          const wasContest = !!activeContest;
          setActiveProblemSlug(null);
          setActiveContest(null);
          if (wasContest) {
            setActiveTab('leaderboard');
          } else {
            setActiveTab('practice');
          }
        }}
        onViewLeaderboard={(targetContestId) => {
          exitBrowserFullscreen();
          const targetId = targetContestId || activeContest?._id || activeContest?.id || activeContest?.slug;
          if (targetId) {
            setLeaderboardContestId(String(targetId));
          }
          setActiveProblemSlug(null);
          setActiveContest(null);
          setActiveTab('leaderboard');
        }}
      />
    );
  }

  return (
    <div className="student-portal-wrapper" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-paper)', fontFamily: 'IBM Plex Sans, sans-serif' }}>
      {/* 1. Persistent Left Sidebar Navigation */}
      <StudentSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        liveContest={liveContest}
        onSignOut={logout}
      />

      {/* 2. Main Right Content Area */}
      <div style={{
        flex: 1,
        marginLeft: collapsed ? '72px' : '240px',
        transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }}>
        {/* Top Header Bar */}
        <StudentHeader
          activeTabTitle={sectionTitles[activeTab] || 'Dashboard'}
          onToggleMobileNav={() => setMobileOpen(!mobileOpen)}
          liveContest={liveContest}
          onOpenContest={handleOpenContest}
          onSignOut={logout}
          onNavigateTab={setActiveTab}
        />

        {/* Section Content Body */}
        <main style={{ padding: '2rem 2.25rem', flex: 1 }}>
          {activeTab === 'dashboard' && (
            <StudentDashboardSection
              user={user}
              stats={stats}
              submissions={submissions}
              contests={contests}
              questions={questions}
              onSelectProblem={handleSelectProblem}
              onOpenContest={handleOpenContest}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'practice' && (
            <StudentPracticeSection
              questions={questions}
              userSubmissions={submissions}
              onSelectProblem={handleSelectProblem}
            />
          )}

          {activeTab === 'contests' && (
            <StudentContestsSection
              contests={contests}
              onOpenContest={handleOpenContest}
            />
          )}

          {activeTab === 'submissions' && (
            <StudentSubmissionsSection
              submissions={submissions}
            />
          )}

          {activeTab === 'leaderboard' && (
            <StudentLeaderboardSection
              contests={contests}
              currentUser={user}
              initialContestId={leaderboardContestId}
            />
          )}

          {activeTab === 'profile' && (
            <StudentProfileSection
              user={user}
              stats={stats}
              submissions={submissions}
              onSignOut={logout}
              onSelectProblem={handleSelectProblem}
            />
          )}
        </main>
      </div>
    </div>
  );
};
