import React, { useState } from 'react';
import { Menu, Radio, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const StudentHeader = ({
  activeTabTitle = 'Dashboard',
  onToggleMobileNav,
  liveContest,
  onOpenContest,
  onSignOut,
  onNavigateTab
}) => {
  const { user } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <header style={{
      minHeight: '64px',
      background: '#FFFFFF',
      borderBottom: '1px solid var(--border-color)',
      padding: '0.6rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 990,
      boxSizing: 'border-box',
      gap: '1rem'
    }}>
      {/* Left: Mobile Menu & Section Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flexShrink: 1 }}>
        <button
          className="student-mobile-menu-btn"
          onClick={onToggleMobileNav}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-ink)',
            display: 'none',
            padding: '4px',
            flexShrink: 0
          }}
        >
          <Menu size={22} />
        </button>

        <div style={{ minWidth: 0 }}>
          <h1 style={{
            fontSize: '1.15rem',
            fontWeight: 800,
            margin: 0,
            color: 'var(--text-ink)',
            lineHeight: 1.25,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {activeTabTitle}
          </h1>
          <span style={{
            fontSize: '0.75rem',
            color: 'var(--text-slate)',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block'
          }}>
            Student Portal / {activeTabTitle}
          </span>
        </div>
      </div>

      {/* Right: Actions, Live Indicator, Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexShrink: 0 }}>
        {/* Active Live Contest Pill */}
        {liveContest && (
          <button
            onClick={() => onOpenContest(liveContest)}
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

        {/* Profile Avatar Dropdown */}
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

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-ink)', lineHeight: 1.1 }}>
                {user?.name || 'Student'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-slate)' }}>
                Candidate
              </span>
            </div>
            <ChevronDown size={14} color="var(--text-slate)" />
          </div>

          {profileDropdownOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '115%',
              width: '200px',
              background: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 10px 20px -3px rgba(0, 0, 0, 0.1)',
              padding: '0.5rem',
              zIndex: 999
            }}>
              <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block' }}>{user?.email}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', fontWeight: 600 }}>Active Student</span>
              </div>

              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  onNavigateTab('profile');
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-ink)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: '4px',
                  textAlign: 'left'
                }}
              >
                <User size={15} /> Profile
              </button>

              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  onSignOut();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem',
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
      </div>
    </header>
  );
};
