import React from 'react';
import {
  LayoutDashboard,
  Trophy,
  FileCode,
  Users,
  ShieldAlert,
  BarChart3,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  Radio,
  Layers
} from 'lucide-react';

export const AdminSidebar = ({
  activeSection,
  setActiveSection,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  liveContestActive = false,
  notificationCount = 3,
  violationCount = 0,
  activeWorkspaceContest = null,
  onOpenWorkspace = null,
  liveContest = null,
  contests = []
}) => {
  const navSections = [
    {
      title: 'Live Ops',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
        {
          id: 'live-proctoring',
          label: 'Live Proctoring',
          icon: ShieldAlert,
          badge: violationCount > 0 ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '0.15rem 0.45rem',
              borderRadius: '999px',
              background: '#FEE2E2',
              color: '#DC2626'
            }}>
              <span className="pulse-icon" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#DC2626', display: 'inline-block' }} />
              {violationCount}
            </span>
          ) : (liveContestActive ? 'REC' : null)
        },
        {
          id: 'workspace',
          label: 'Contest Workspace',
          icon: Layers,
          badge: activeWorkspaceContest ? 'OPEN' : (liveContestActive ? 'LIVE' : null)
        }
      ]
    },
    {
      title: 'Content',
      items: [
        { id: 'problem-bank', label: 'Problem Bank', icon: FileCode, badge: null },
        { id: 'contests', label: 'Contests', icon: Trophy, badge: liveContestActive ? 'LIVE' : null }
      ]
    },
    {
      title: 'People & Data',
      items: [
        { id: 'submissions', label: 'Submissions', icon: FileCode, badge: null },
        { id: 'results-reports', label: 'Results & Reports', icon: BarChart3, badge: null },
        { id: 'user-management', label: 'Users', icon: UserCog, badge: null }
      ]
    }
  ];

  const handleItemClick = (itemId) => {
    if (itemId === 'workspace') {
      if (activeWorkspaceContest) {
        // Already in active workspace
      } else if (liveContest && onOpenWorkspace) {
        onOpenWorkspace(liveContest);
      } else if (contests.length > 0 && onOpenWorkspace) {
        onOpenWorkspace(contests[0]);
      } else {
        setActiveSection('contests');
      }
    } else {
      setActiveSection(itemId);
    }
    if (mobileOpen) setMobileOpen(false);
  };

  const isItemActive = (itemId) => {
    if (itemId === 'workspace') {
      return Boolean(activeWorkspaceContest);
    }
    return !activeWorkspaceContest && activeSection === itemId;
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="admin-mobile-backdrop"
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

      <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`} style={{
        width: collapsed ? '72px' : '260px',
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
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0
        }}>
          {!collapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <img
                src="/coders_club_logo.png"
                alt="Coders' Club Logo"
                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
              />
              <div>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-ink)', display: 'block', lineHeight: 1.1 }}>
                  CodeArena
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  GPREC Admin Suite
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

          {/* Desktop Collapse Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="admin-sidebar-toggle-btn"
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
              color: 'var(--text-secondary)'
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Live Contest Indicator Pill */}
        {liveContestActive && !collapsed && (
          <div style={{
            margin: '0.85rem 1rem 0.25rem',
            padding: '0.6rem 0.85rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Radio size={14} color="#DC2626" className="pulse-icon" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#DC2626' }}>LIVE CONTEST ACTIVE</span>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <nav style={{
          flex: 1,
          padding: '0.75rem 0.75rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          {navSections.map((section, sIdx) => (
            <div key={section.title || sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {/* Section Header */}
              {!collapsed ? (
                <div style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '0.4rem 0.75rem 0.2rem',
                  userSelect: 'none'
                }}>
                  {section.title}
                </div>
              ) : (
                sIdx > 0 && (
                  <div style={{
                    height: '1px',
                    background: 'var(--border-color)',
                    margin: '0.35rem 0.5rem',
                    opacity: 0.6
                  }} />
                )
              )}

              {/* Section Items */}
              {section.items.map(item => {
                const Icon = item.icon;
                const active = isItemActive(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: collapsed ? 'center' : 'space-between',
                      padding: collapsed ? '0.75rem 0' : '0.6rem 0.85rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: active ? 'rgba(46, 94, 255, 0.08)' : 'transparent',
                      color: active ? 'var(--accent-blue)' : 'var(--text-ink)',
                      fontWeight: active ? 700 : 500,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title={collapsed ? item.label : ''}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Icon size={18} color={active ? 'var(--accent-blue)' : 'var(--text-secondary)'} />
                      {!collapsed && <span>{item.label}</span>}
                    </div>

                    {!collapsed && item.badge && (
                      typeof item.badge === 'string' ? (
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          background: item.badge === 'LIVE' || item.badge === 'REC' ? '#FEE2E2' : 'var(--bg-paper)',
                          color: item.badge === 'LIVE' || item.badge === 'REC' ? '#DC2626' : 'var(--text-secondary)'
                        }}>
                          {item.badge}
                        </span>
                      ) : item.badge
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Pinned Area: Settings & System Status */}
        <div style={{
          borderTop: '1px solid var(--border-color)',
          padding: '0.5rem 0.75rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          background: '#FAFAFA',
          flexShrink: 0
        }}>
          <button
            onClick={() => handleItemClick('settings')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '0.75rem 0' : '0.6rem 0.85rem',
              borderRadius: '8px',
              border: 'none',
              background: !activeWorkspaceContest && activeSection === 'settings' ? 'rgba(46, 94, 255, 0.08)' : 'transparent',
              color: !activeWorkspaceContest && activeSection === 'settings' ? 'var(--accent-blue)' : 'var(--text-ink)',
              fontWeight: !activeWorkspaceContest && activeSection === 'settings' ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              gap: '0.75rem'
            }}
            title={collapsed ? 'Settings' : ''}
          >
            <Settings size={18} color={!activeWorkspaceContest && activeSection === 'settings' ? 'var(--accent-blue)' : 'var(--text-secondary)'} />
            {!collapsed && <span>Settings</span>}
          </button>

          {!collapsed && (
            <div style={{
              padding: '0.5rem 0.85rem 0.25rem',
              borderTop: '1px solid rgba(0,0,0,0.05)',
              marginTop: '0.2rem'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>System Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem', fontSize: '0.75rem', color: '#15803D', fontWeight: 700 }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E' }} />
                Judge0 & DB Operational
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
