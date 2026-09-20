import React, { useState } from 'react';
import { Search, Bell, Menu, Radio, LogOut, User, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminHeader = ({
  activeSectionTitle = 'Dashboar',
  searchQuery,
  setSearchQuery,
  onToggleMobileNav,
  onToggleNotifications,
  notificationCount = 3,
  liveContest,
  onSignOut,
  onOpenLiveContest
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
      {/* Left: Mobile Toggle & Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flexShrink: 1 }}>
        <button
          className="admin-mobile-menu-btn"
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
            {activeSectionTitle}
          </h1>
          <span style={{
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block'
          }}>
            Admin Portal / {activeSectionTitle}
          </span>
        </div>
      </div>

      {/* Middle: Global Search */}
      <div className="admin-search-wrapper" style={{
        maxWidth: '320px',
        width: '100%',
        minWidth: '160px',
        position: 'relative',
        flexShrink: 1
      }}>
        <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search contests, problems, participants..."
          style={{
            width: '100%',
            padding: '0.45rem 0.75rem 0.45rem 2.25rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-paper)',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        />
      </div>

      {/* Right: Actions, Live Indicator, Notifications, Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexShrink: 0 }}>
        {/* Live Contest Pill */}
        {liveContest && (
          <button
            onClick={() => onOpenLiveContest(liveContest)}
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
            <span>{liveContest.title || 'Live Contest'}</span>
          </button>
        )}

        {/* Notifications Bell */}
        <button
          onClick={onToggleNotifications}
          style={{
            border: 'none',
            background: 'var(--bg-paper)',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            color: 'var(--text-ink)'
          }}
        >
          <Bell size={18} />
          {notificationCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#DC2626',
              color: '#FFFFFF',
              fontSize: '0.65rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {notificationCount}
            </span>
          )}
        </button>

        {/* Admin Profile Dropdown */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
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
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-ink)', lineHeight: 1.1 }}>
                {user?.name || 'Admin'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Administrator
              </span>
            </div>
          </div>

          {profileDropdownOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '110%',
              width: '200px',
              background: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              padding: '0.5rem',
              zIndex: 999
            }}>
              <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block' }}>{user?.email}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', fontWeight: 600 }}>Super Admin</span>
              </div>

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
                  borderRadius: '4px'
                }}
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
