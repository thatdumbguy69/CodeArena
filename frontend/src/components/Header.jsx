import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChevronDown, LogOut } from 'lucide-react';

export const Header = ({ onSignOut }) => {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  if (!user) return null;

  const handleSignOutClick = () => {
    setUserMenuOpen(false);
    logout();
    if (onSignOut) {
      onSignOut();
    }
  };

  return (
    <header style={{
      height: '56px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 90
    }}>
      <div style={{ position: 'relative' }}>
        <div
          className="user-profile-badge"
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-paper)',
            border: '1px solid var(--border-color)'
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-ink)', lineHeight: 1.2 }}>{user.name}</div>
            <div style={{ marginTop: '0.1rem' }}>
              <span className={`badge ${user.role === 'admin' ? 'badge-hard' : 'badge-blue'}`} style={{ padding: '0.05rem 0.35rem', fontSize: '0.68rem' }}>
                {user.role.toUpperCase()}
              </span>
            </div>
          </div>
          <ChevronDown size={14} color="var(--text-slate)" />
        </div>

        {userMenuOpen && (
          <div style={{
            position: 'absolute',
            top: '110%',
            right: 0,
            width: '180px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.35rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            zIndex: 100
          }}>
            <button
              className="sidebar-link"
              onClick={handleSignOutClick}
              style={{ width: '100%', color: 'var(--diff-hard)', fontSize: '0.82rem', padding: '0.4rem 0.6rem', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
