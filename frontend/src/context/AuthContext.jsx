import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

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

// Destroy auth session when tab is opened freshly or reopened, while keeping saved problem code in localStorage
if (!isPageReload) {
  try {
    sessionStorage.clear();
    localStorage.removeItem('codearena_token');
    localStorage.removeItem('codearena_user');
    localStorage.removeItem('codearena_current_tab');
    localStorage.removeItem('codearena_landing_sub_tab');
    localStorage.removeItem('codearena_student_activeTab');
    localStorage.removeItem('codearena_student_activeProblemSlug');
    localStorage.removeItem('codearena_student_activeContest');
    localStorage.removeItem('codearena_admin_activeSection');
    localStorage.removeItem('codearena_admin_activeWorkspaceContest');
  } catch (e) {}
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      if (!isPageReload) return null;
      const saved = sessionStorage.getItem('codearena_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    if (!isPageReload) return null;
    return sessionStorage.getItem('codearena_token') || null;
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && !user) {
      fetchCurrentUser();
    }
  }, [token]);

  // Global event listener to immediately wipe session on 401 or server restart
  useEffect(() => {
    const handleLogoutEvent = () => {
      logout();
    };
    window.addEventListener('codearena:logout', handleLogoutEvent);
    return () => {
      window.removeEventListener('codearena:logout', handleLogoutEvent);
    };
  }, []);

  const fetchCurrentUser = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get('/auth/me');
      if (res.data?.user) {
        setUser(res.data.user);
        sessionStorage.setItem('codearena_user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.warn('Failed to load current user profile:', err);
      logout();
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data;
    sessionStorage.setItem('codearena_token', newToken);
    sessionStorage.setItem('codearena_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    setLoading(false);
    return userData;
  };

  const register = async (name, teamName, email, password, role = 'student') => {
    const res = await api.post('/auth/register', { name, teamName, email, password, role });
    const { token: newToken, user: userData } = res.data;
    sessionStorage.setItem('codearena_token', newToken);
    sessionStorage.setItem('codearena_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    setLoading(false);
    return userData;
  };

  const logout = () => {
    sessionStorage.clear();
    try {
      localStorage.removeItem('codearena_token');
      localStorage.removeItem('codearena_user');
      localStorage.removeItem('codearena_current_tab');
      localStorage.removeItem('codearena_landing_sub_tab');
      localStorage.removeItem('codearena_student_activeTab');
      localStorage.removeItem('codearena_student_activeProblemSlug');
      localStorage.removeItem('codearena_student_activeContest');
      localStorage.removeItem('codearena_admin_activeSection');
      localStorage.removeItem('codearena_admin_activeWorkspaceContest');
    } catch (e) {}
    setToken(null);
    setUser(null);
  };

  const loginAsAdmin = async () => {
    return await login('tabraizsmd@gmail.com', 'Shamstabraiz@7931');
  };

  const loginAsStudent = async () => {
    return await login('student@codearena.com', 'student123');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        loginAsAdmin,
        loginAsStudent,
        refreshUser: fetchCurrentUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
