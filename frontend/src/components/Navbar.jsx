import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Code2,
  BookOpen,
  Trophy,
  BarChart2,
  Shield,
  UserCheck,
  Info,
  ChevronDown
} from 'lucide-react';
import { ABOUT_SUBTABS } from './common/AboutCodeArenaSection';

export const Navbar = ({ currentTab, setCurrentTab, landingSubTab, navigateLandingSub }) => {
  const { user } = useAuth();
  const [aboutExpanded, setAboutExpanded] = useState(() => currentTab === 'landing');

  // Hide general navigation sidebar during problem solving (arena and contest mode) or when inside Admin Portal
  const isAdminTab = currentTab === 'admin' || currentTab === 'create-problem' || currentTab === 'host-contest' || currentTab === 'admin-analytics';
  if (currentTab === 'arena' || currentTab === 'contest' || (user && user.role === 'admin' && isAdminTab)) {
    return null;
  }

  const isSubActive = (sub) => currentTab === 'landing' && landingSubTab === sub;

  // Authenticated Mode: Render Fixed Left Sidebar
  if (user) {
    return (
      <aside className="app-sidebar">
        <div className="sidebar-top">
          {/* Plain Wordmark Logo */}
          <div
            className="sidebar-brand"
            onClick={() => setCurrentTab('dashboard')}
          >
            <Code2 size={20} color="var(--accent-blue)" />
            <span>CodeArena</span>
          </div>

          <nav className="sidebar-nav">
            {/* Priority 1: Dashboard (Overview & Personal Stats) */}
            <button
              className={`sidebar-link ${currentTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentTab('dashboard')}
            >
              <UserCheck size={16} />
              Dashboard
            </button>

            {/* Priority 2: Practice */}
            <button
              className={`sidebar-link ${currentTab === 'problems' || currentTab === 'arena' ? 'active' : ''}`}
              onClick={() => setCurrentTab('problems')}
            >
              <BookOpen size={16} />
              Practice
            </button>

            {/* Priority 3: Contests */}
            <button
              className={`sidebar-link ${currentTab === 'contests' || currentTab === 'contest' ? 'active' : ''}`}
              onClick={() => setCurrentTab('contests')}
            >
              <Trophy size={16} />
              Contests
            </button>

            {/* Priority 4: Leaderboard */}
            <button
              className={`sidebar-link ${currentTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setCurrentTab('leaderboard')}
            >
              <BarChart2 size={16} />
              Leaderboard
            </button>

            {/* Priority 5: Admin Panel — Strictly ONLY rendered for admin-role users, separated by divider */}
            {user.role === 'admin' && (
              <>
                <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.65rem 0' }} />
                <button
                  className={`sidebar-link ${currentTab === 'admin' || currentTab === 'admin-analytics' ? 'active' : ''}`}
                  onClick={() => setCurrentTab('admin')}
                >
                  <Shield size={16} />
                  Admin Panel
                </button>
              </>
            )}

            {/* About CodeArena info tab with expandable subtabs */}
            <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.65rem 0' }} />
            <button
              className={`sidebar-link ${currentTab === 'landing' ? 'active' : ''}`}
              onClick={() => {
                setAboutExpanded(prev => !prev);
                if (navigateLandingSub) navigateLandingSub('home');
                setCurrentTab('landing');
              }}
              style={{ justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Info size={16} />
                <span>About CodeArena</span>
              </div>
              <ChevronDown
                size={14}
                style={{
                  transform: aboutExpanded ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                  color: 'var(--text-secondary)'
                }}
              />
            </button>

            {aboutExpanded && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
                marginLeft: '1.25rem',
                paddingLeft: '0.75rem',
                borderLeft: '2px solid rgba(46, 94, 255, 0.25)',
                marginTop: '0.25rem'
              }}>
                {ABOUT_SUBTABS.map(sub => {
                  const isSubActive = currentTab === 'landing' && landingSubTab === sub.id;
                  const SubIcon = sub.icon;
                  return (
                    <button
                      key={sub.id}
                      className={`sidebar-link ${isSubActive ? 'active' : ''}`}
                      onClick={() => {
                        if (navigateLandingSub) navigateLandingSub(sub.id);
                        setCurrentTab('landing');
                      }}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.55rem' }}
                    >
                      <SubIcon size={13} />
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </nav>
        </div>
      </aside>
    );
  }

  // Public / Logged-out Mode: Simple Top Header Bar (No glow, plain wordmark)
  return (
    <header className="public-navbar">
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '60px',
        padding: '0 1.5rem'
      }}>
        {/* Coders' Club Logo & CodeArena Brand Wordmark */}
        <div
          onClick={() => navigateLandingSub('home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            fontWeight: 700,
            color: 'var(--text-ink)'
          }}
        >
          <img
            src="/coders_club_logo.png"
            alt="Coders' Club Logo"
            style={{ height: '38px', width: 'auto', objectFit: 'contain' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>CodeArena</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-slate)', fontWeight: 600 }}>G. Pulla Reddy Engg College</span>
          </div>
        </div>





        {/* Public Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {['home', 'about', 'rules', 'terms', 'faqs', 'contact'].map((sub) => {
            const labelMap = {
              home: 'Home',
              about: 'About Us',
              rules: 'Rules',
              terms: 'Terms & Conditions',
              faqs: 'FAQs',
              contact: 'Contact Us'
            };
            const active = isSubActive(sub);
            return (
              <button
                key={sub}
                className="btn btn-secondary btn-sm"
                onClick={() => navigateLandingSub(sub)}
                style={{
                  border: 'none',
                  background: active ? 'var(--bg-paper)' : 'transparent',
                  color: active ? 'var(--accent-blue)' : 'var(--text-slate)',
                  fontWeight: active ? 600 : 500
                }}
              >
                {labelMap[sub]}
              </button>
            );
          })}
        </div>

        {/* Sign In Button */}
        <div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setCurrentTab('auth')}
          >
            Sign In
          </button>
        </div>
      </div>
    </header>
  );
};
