import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { ContestList } from './pages/ContestList';
import { ProblemList } from './pages/ProblemList';
import { ProblemArena } from './pages/ProblemArena';
import { AdminDashboard } from './pages/AdminDashboard';
import { Leaderboard } from './pages/Leaderboard';
import { StudentDashboard } from './pages/StudentDashboard';
import { ContestMode } from './pages/ContestMode';
import { AuthPage } from './pages/AuthPage';
import { AdminContestManagement } from './pages/AdminContestManagement';

import { CreateProblemPage } from './pages/CreateProblemPage';
import { HostContestPage } from './pages/HostContestPage';

const isPageReload = (() => {
  try {
    const nav = performance.getEntriesByType('navigation');
    if (nav && nav.length > 0) {
      return nav[0].type === 'reload';
    }
    return performance.navigation && performance.navigation.type === 1;
  } catch (e) {
    return false;
  }
})();

const AppContent = () => {
  const { user } = useAuth();

  const [currentTab, setCurrentTabState] = useState(() => {
    if (!isPageReload) return 'landing';
    return sessionStorage.getItem('codearena_current_tab') || 'landing';
  });

  const [landingSubTab, setLandingSubTabState] = useState(() => {
    if (!isPageReload) return 'home';
    return sessionStorage.getItem('codearena_landing_sub_tab') || 'home';
  });

  const [selectedProblemSlug, setSelectedProblemSlugState] = useState(() => {
    return sessionStorage.getItem('codearena_selected_problem_slug') || null;
  });

  const [selectedContest, setSelectedContestState] = useState(() => {
    try {
      const saved = sessionStorage.getItem('codearena_selected_contest');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [selectedContestAnalytics, setSelectedContestAnalyticsState] = useState(() => {
    return sessionStorage.getItem('codearena_selected_contest_analytics') || null;
  });

  const [editingProblem, setEditingProblemState] = useState(() => {
    try {
      const saved = sessionStorage.getItem('codearena_editing_problem');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [editingContest, setEditingContestState] = useState(() => {
    try {
      const saved = sessionStorage.getItem('codearena_editing_contest');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const setCurrentTab = (tab) => {
    setCurrentTabState(tab);
    sessionStorage.setItem('codearena_current_tab', tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setLandingSubTab = (subTab) => {
    setLandingSubTabState(subTab);
    sessionStorage.setItem('codearena_landing_sub_tab', subTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setSelectedProblemSlug = (slug) => {
    setSelectedProblemSlugState(slug);
    if (slug) sessionStorage.setItem('codearena_selected_problem_slug', slug);
    else sessionStorage.removeItem('codearena_selected_problem_slug');
  };

  const setSelectedContest = (contest) => {
    setSelectedContestState(contest);
    if (contest) sessionStorage.setItem('codearena_selected_contest', JSON.stringify(contest));
    else sessionStorage.removeItem('codearena_selected_contest');
  };

  const setSelectedContestAnalytics = (analyticsId) => {
    setSelectedContestAnalyticsState(analyticsId);
    if (analyticsId) sessionStorage.setItem('codearena_selected_contest_analytics', analyticsId);
    else sessionStorage.removeItem('codearena_selected_contest_analytics');
  };

  const setEditingProblem = (problem) => {
    setEditingProblemState(problem);
    if (problem) sessionStorage.setItem('codearena_editing_problem', JSON.stringify(problem));
    else sessionStorage.removeItem('codearena_editing_problem');
  };

  const setEditingContest = (contest) => {
    setEditingContestState(contest);
    if (contest) sessionStorage.setItem('codearena_editing_contest', JSON.stringify(contest));
    else sessionStorage.removeItem('codearena_editing_contest');
  };

  const handleSelectProblem = (slug) => {
    setSelectedProblemSlug(slug);
    setCurrentTab('arena');
  };

  const handleEnterContest = (contest) => {
    setSelectedContest(contest);
    setCurrentTab('contest');
  };

  const navigateLandingSub = (subTab) => {
    setLandingSubTab(subTab);
    setCurrentTab('landing');
  };

  const handleSignOut = () => {
    setSelectedProblemSlug(null);
    setSelectedContest(null);
    setSelectedContestAnalytics(null);
    setEditingProblem(null);
    setEditingContest(null);
    sessionStorage.removeItem('codearena_user');
    sessionStorage.removeItem('codearena_admin_suite_loaded');
    setLandingSubTab('home');
    setCurrentTab('landing');
  };

  useEffect(() => {
    const handleLogoutEvent = () => {
      handleSignOut();
    };
    window.addEventListener('codearena:logout', handleLogoutEvent);
    return () => {
      window.removeEventListener('codearena:logout', handleLogoutEvent);
    };
  }, []);

  const storedUser = (() => {
    try {
      const raw = sessionStorage.getItem('codearena_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  })();

  const activeUser = user || storedUser;
  const isProblemSolving = currentTab === 'arena' || currentTab === 'contest';
  const isAdminUser = activeUser && activeUser.role === 'admin';
  const isAdminTab = currentTab === 'admin' || currentTab === 'create-problem' || currentTab === 'host-contest' || currentTab === 'admin-analytics';
  const isStudentPortal = activeUser && activeUser.role !== 'admin' && (currentTab === 'dashboard' || currentTab === 'problems' || currentTab === 'contests' || currentTab === 'leaderboard');
  const isFullWorkspaceMode = isProblemSolving || (isAdminUser && (isAdminTab || currentTab === 'dashboard')) || isStudentPortal;

  const handleAuthSuccess = (authUser, fallbackTab = 'dashboard') => {
    const targetUser = authUser || user || (() => {
      try {
        const raw = sessionStorage.getItem('codearena_user');
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    })();

    if (targetUser?.role === 'admin') {
      setCurrentTab('admin');
    } else {
      setCurrentTab(fallbackTab);
    }
  };

  return (
    <div className={`app-container ${activeUser && !isFullWorkspaceMode ? 'has-sidebar' : ''}`}>
      {/* Navbar handles sidebar layout when authenticated, or top bar when logged out */}
      {!isFullWorkspaceMode && (
        <Navbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          landingSubTab={landingSubTab}
          navigateLandingSub={navigateLandingSub}
        />
      )}

      <div className="main-wrapper">
        {/* Top Header Bar for Authenticated Users (Hosts User Profile Badge at Top Right Corner) */}
        {activeUser && !isFullWorkspaceMode && <Header onSignOut={handleSignOut} />}

        <main className="main-content">
          {currentTab === 'landing' && (
            <LandingPage
              setCurrentTab={setCurrentTab}
              landingSubTab={landingSubTab}
              setLandingSubTab={setLandingSubTab}
              setSelectedProblemSlug={setSelectedProblemSlug}
            />
          )}

          {currentTab === 'auth' && (
            <AuthPage onAuthSuccess={(authUser) => handleAuthSuccess(authUser, 'dashboard')} />
          )}

          {currentTab === 'contests' && (
            <ContestList
              onEnterContest={handleEnterContest}
              setCurrentTab={setCurrentTab}
            />
          )}

          {currentTab === 'problems' && (
            <ProblemList
              onSelectProblem={handleSelectProblem}
              setCurrentTab={setCurrentTab}
            />
          )}

          {currentTab === 'arena' && (
            <ProblemArena
              problemSlug={selectedProblemSlug || 'two-sum'}
              onBack={() => setCurrentTab('problems')}
            />
          )}

          {currentTab === 'leaderboard' && (
            <Leaderboard setCurrentTab={setCurrentTab} />
          )}

          {currentTab === 'admin' && (
            isAdminUser ? (
              <AdminDashboard
                setCurrentTab={setCurrentTab}
                setSelectedContestAnalytics={setSelectedContestAnalytics}
                setEditingProblem={setEditingProblem}
                setEditingContest={setEditingContest}
              />
            ) : (
              <AuthPage onAuthSuccess={(authUser) => handleAuthSuccess(authUser, 'admin')} />
            )
          )}

          {currentTab === 'create-problem' && (
            isAdminUser ? (
              <CreateProblemPage
                problemToEdit={editingProblem}
                setCurrentTab={setCurrentTab}
              />
            ) : (
              <AuthPage onAuthSuccess={(authUser) => handleAuthSuccess(authUser, 'create-problem')} />
            )
          )}

          {currentTab === 'host-contest' && (
            isAdminUser ? (
              <HostContestPage
                contestToEdit={editingContest}
                setCurrentTab={setCurrentTab}
              />
            ) : (
              <AuthPage onAuthSuccess={(authUser) => handleAuthSuccess(authUser, 'host-contest')} />
            )
          )}

          {currentTab === 'admin-analytics' && (
            isAdminUser ? (
              <AdminContestManagement contestId={selectedContestAnalytics} setCurrentTab={setCurrentTab} />
            ) : (
              <AuthPage onAuthSuccess={(authUser) => handleAuthSuccess(authUser, 'admin-analytics')} />
            )
          )}

          {currentTab === 'dashboard' && (
            activeUser ? (
              isAdminUser ? (
                <AdminDashboard
                  setCurrentTab={setCurrentTab}
                  setSelectedContestAnalytics={setSelectedContestAnalytics}
                  setEditingProblem={setEditingProblem}
                  setEditingContest={setEditingContest}
                />
              ) : (
                <StudentDashboard setCurrentTab={setCurrentTab} onSelectProblem={handleSelectProblem} />
              )
            ) : (
              <AuthPage onAuthSuccess={(authUser) => handleAuthSuccess(authUser, 'dashboard')} />
            )
          )}

          {currentTab === 'contest' && (
            <ContestMode
              contest={selectedContest}
              onFinishContest={() => setCurrentTab('contests')}
              onBack={() => setCurrentTab('contests')}
            />
          )}
        </main>

        {(currentTab === 'landing' || currentTab === 'auth') && (
          <Footer setCurrentTab={setCurrentTab} landingSubTab={landingSubTab} navigateLandingSub={navigateLandingSub} />
        )}
      </div>
    </div>
  );
};

import { SocketProvider } from './context/SocketContext';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}
