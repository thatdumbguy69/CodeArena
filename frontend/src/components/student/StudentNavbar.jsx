import React, { useState } from 'react';
import {
  Code2,
  LayoutDashboard,
  BookOpen,
  Trophy,
  Send,
  BarChart2,
  User,
  LogOut,
  Radio,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const StudentNavbar = ({
  activeTab,
  setActiveTab,
  liveContest,
  onOpenContest,
  onSignOut
}) => {
  const { user } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'practice', label: 'Practice', icon: BookOpen },
    { id: 'contests', label: 'Contests', icon: Trophy, badge: liveContest ? 'LIVE' : null },
    { id: 'submissions', label: 'Submissions', icon: Send },
    { id: 'leaderboard', label: 'Leaderboard', icon: BarChart2 },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <header style={{
      height: '64px',
      background: '#FFFFFF',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 990,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
    }}>
      <div className="container" style={{
        maxWidth: '1240px',
        margin: '0 auto',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem'
      }}>
        {/* Left: Brand Logo */}
        <div
          onClick={() => setActiveTab('dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '1.25rem',
            color: 'var(--text-ink)'
          }}
        >
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'var(--accent-blue)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Code2 size={20} />
          </div>
          <span>CodeArena</span>
        </div>

        {/* Center: Desktop Navigation Tabs */}
        <nav className="student-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 0.95rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: active ? 'var(--accent-blue-light)' : 'transparent',
                  color: active ? 'var(--accent-blue)' : 'var(--text-slate)',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} color={active ? 'var(--accent-blue)' : 'var(--text-slate)'} />
                <span>{item.label}</span>

                {item.badge && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px',
                    background: '#FEE2E2',
                    color: '#DC2626',
                    marginLeft: '2px'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Actions, Live Indicator, Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Active Live Contest Pill */}
          {liveContest && (
            <button
              onClick={() => onOpenContest && onOpenContest(liveContest)}
              className="student-live-pill"
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '20px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#DC2626',
                fontWeight: 700,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer'
              }}
            >
              <Radio size={14} className="pulse-icon" />
              <span>🔴 {liveContest.title || 'Live Contest'}</span>
            </button>
          )}

          {/* Profile Dropdown */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                padding: '0.25rem 0.5rem',
                borderRadius: '8px',
                background: profileDropdownOpen ? 'var(--bg-paper)' : 'transparent'
              }}
            >
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'var(--accent-blue)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
              </div>

              <span className="student-profile-name" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-ink)' }}>
                {user?.name || 'Student'}
              </span>
              <ChevronDown size={14} color="var(--text-slate)" />
            </div>

            {profileDropdownOpen && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '115%',
                width: '210px',
                background: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 10px 20px -3px rgba(0, 0, 0, 0.1)',
                padding: '0.5rem',
                zIndex: 999
              }}>
                <div style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.3rem' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-ink)', display: 'block' }}>{user?.name}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-slate)' }}>{user?.email}</span>
                </div>

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    setActiveTab('profile');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.5rem 0.6rem',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-ink)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    borderRadius: '4px',
                    textAlign: 'left'
                  }}
                >
                  <User size={15} /> View Profile
                </button>

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    setActiveTab('dashboard');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.5rem 0.6rem',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-ink)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    borderRadius: '4px',
                    textAlign: 'left'
                  }}
                >
                  <LayoutDashboard size={15} /> Dashboard
                </button>

                <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.3rem 0' }} />

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    onSignOut();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.5rem 0.6rem',
                    border: 'none',
                    background: 'transparent',
                    color: '#DC2626',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    borderRadius: '4px',
                    textAlign: 'left'
                  }}
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Drawer Hamburger */}
          <button
            className="student-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-ink)',
              display: 'none'
            }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '64px',
          left: 0,
          right: 0,
          background: '#FFFFFF',
          borderBottom: '1px solid var(--border-color)',
          padding: '1rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          boxShadow: '0 10px 20px rgba(0, 0, 0, 0.05)',
          zIndex: 998
        }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: active ? 'var(--accent-blue-light)' : 'transparent',
                  color: active ? 'var(--accent-blue)' : 'var(--text-ink)',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
