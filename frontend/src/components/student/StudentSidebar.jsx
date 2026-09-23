import React, { useState, useEffect } from 'react';
import {
  Code2,
  LayoutDashboard,
  BookOpen,
  Trophy,
  Send,
  BarChart2,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Radio,
  Info,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ABOUT_SUBTABS } from '../common/AboutCodeArenaSection';

export const StudentSidebar = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  liveContest,
  onSignOut,
  aboutSubTab = 'home',
  onSelectAboutSubTab = null
}) => {
  const { user } = useAuth();

  const [aboutExpanded, setAboutExpanded] = useState(() => {
    return activeTab === 'about';
  });

  useEffect(() => {
    if (activeTab === 'about') {
      setAboutExpanded(true);
    }
  }, [activeTab]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'practice', label: 'Practice', icon: BookOpen, badge: null },
    { id: 'contests', label: 'Contests', icon: Trophy, badge: liveContest ? 'LIVE' : null },
    { id: 'submissions', label: 'Submissions', icon: Send, badge: null },
    { id: 'leaderboard', label: 'Leaderboard', icon: BarChart2, badge: null },
    { id: 'profile', label: 'Profile', icon: User, badge: null },
    { id: 'about', label: 'About CodeArena', icon: Info, badge: null, isExpandable: true }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 998
          }}
        />
      )}

      <aside className={`student-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`} style={{
        width: collapsed ? '72px' : '240px',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        background: '#FFFFFF',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 999,
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.02)'
      }}>
        {/* Brand Header */}
        <div style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0' : '0 1.25rem',
          borderBottom: '1px solid var(--border-color)'
        }}>
          {!collapsed ? (
            <div
              onClick={() => setActiveTab('dashboard')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
            >
              <img
                src="/coders_club_logo.png"
                alt="Coders' Club Logo"
                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
              />
              <div>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-ink)', display: 'block', lineHeight: 1.1 }}>
                  CodeArena
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-slate)', fontWeight: 600 }}>
                  GPREC Student Portal
                </span>
              </div>
            </div>
          ) : (
            <img
              src="/coders_club_logo.png"
              alt="Coders' Club Logo"
              style={{ width: '30px', height: '30px', objectFit: 'contain' }}
            />
          )}



          {/* Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="sidebar-toggle-btn"
            style={{
              border: 'none',
              background: 'var(--bg-paper)',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-slate)'
            }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Live Contest Pill Indicator */}
        {liveContest && !collapsed && (
          <div style={{
            margin: '0.85rem 1rem 0.25rem',
            padding: '0.6rem 0.85rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Radio size={14} color="#DC2626" className="pulse-icon" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#DC2626' }}>LIVE CONTEST</span>
            </div>
          </div>
        )}

        {/* Navigation Section */}
        <nav style={{ flex: 1, padding: '0.85rem 0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            const isExpandable = item.isExpandable;

            const handleItemClick = () => {
              if (item.id === 'about') {
                const next = !aboutExpanded;
                setAboutExpanded(next);
                if (collapsed && setCollapsed) {
                  setCollapsed(false);
                }
                setActiveTab('about');
                if (onSelectAboutSubTab) {
                  onSelectAboutSubTab('home');
                }
                if (mobileOpen) setMobileOpen(false);
                return;
              }

              setActiveTab(item.id);
              if (mobileOpen) setMobileOpen(false);
            };

            return (
              <React.Fragment key={item.id}>
                <button
                  onClick={handleItemClick}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    padding: collapsed ? '0.75rem 0' : '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: active ? 'var(--accent-blue-light)' : 'transparent',
                    color: active ? 'var(--accent-blue)' : 'var(--text-slate)',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title={collapsed ? item.label : ''}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Icon size={18} color={active ? 'var(--accent-blue)' : 'var(--text-slate)'} />
                    {!collapsed && <span>{item.label}</span>}
                  </div>

                  {!collapsed && isExpandable && (
                    <div style={{
                      display: 'inline-flex',
                      transform: aboutExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      color: active ? 'var(--accent-blue)' : 'var(--text-slate)'
                    }}>
                      <ChevronDown size={15} />
                    </div>
                  )}

                  {!collapsed && !isExpandable && item.badge && (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      background: '#FEE2E2',
                      color: '#DC2626'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>

                {/* Subtabs Drawer for About CodeArena */}
                {!collapsed && isExpandable && aboutExpanded && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem',
                    marginLeft: '1.25rem',
                    paddingLeft: '0.75rem',
                    borderLeft: '2px solid rgba(46, 94, 255, 0.25)',
                    marginTop: '0.25rem',
                    marginBottom: '0.5rem'
                  }}>
                    {ABOUT_SUBTABS.map(sub => {
                      const isSubActive = activeTab === 'about' && (aboutSubTab || 'home') === sub.id;
                      const SubIcon = sub.icon;
                      return (
                        <button
                          key={sub.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab('about');
                            if (onSelectAboutSubTab) {
                              onSelectAboutSubTab(sub.id);
                            }
                            if (mobileOpen) setMobileOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.55rem',
                            padding: '0.35rem 0.6rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: isSubActive ? 'rgba(46, 94, 255, 0.1)' : 'transparent',
                            color: isSubActive ? 'var(--accent-blue)' : 'var(--text-slate)',
                            fontWeight: isSubActive ? 700 : 500,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <SubIcon size={13} color={isSubActive ? 'var(--accent-blue)' : 'var(--text-slate)'} />
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Bottom Profile / Sign Out Footer */}
        {!collapsed ? (
          <div style={{
            padding: '1rem',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-paper)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--accent-blue)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-ink)', display: 'block', lineHeight: 1.1 }}>
                    {user?.name || 'Student'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-slate)' }}>
                    Candidate
                  </span>
                </div>
              </div>

              <button
                onClick={onSignOut}
                title="Sign Out"
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#DC2626',
                  padding: '0.3rem'
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            padding: '1rem 0',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <button
              onClick={onSignOut}
              title="Sign Out"
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#DC2626'
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
