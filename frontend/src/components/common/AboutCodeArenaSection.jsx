import React from 'react';
import { Home, Info, BookOpen, ShieldCheck, HelpCircle, PhoneCall } from 'lucide-react';
import { LandingPage } from '../../pages/LandingPage';
import { Footer } from '../Footer';

export const ABOUT_SUBTABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'about', label: 'About Us', icon: Info },
  { id: 'rules', label: 'Rules', icon: BookOpen },
  { id: 'terms', label: 'Terms & Conditions', icon: ShieldCheck },
  { id: 'faqs', label: 'FAQs', icon: HelpCircle },
  { id: 'contact', label: 'Contact Us', icon: PhoneCall },
];

export const AboutCodeArenaSection = ({
  activeSubTab = 'home',
  onSelectSubTab,
  setCurrentTab,
  onNavigatePortalTab
}) => {
  const currentSub = activeSubTab || 'home';

  const handleSubTabChange = (tabId) => {
    if (onSelectSubTab) {
      onSelectSubTab(tabId);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      margin: '-1.25rem -1.5rem',
      background: 'var(--bg-paper)'
    }}>
      {/* Top Subtabs Navigation Bar */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'rgba(46, 94, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-blue)'
          }}>
            <Info size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-ink)', lineHeight: 1.1 }}>
              About CodeArena
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-slate)', fontWeight: 500 }}>
              Platform Overview &amp; Guidelines
            </div>
          </div>
        </div>

        {/* Subtabs Pill Switcher */}
        <div style={{
          display: 'flex',
          gap: '0.35rem',
          flexWrap: 'wrap',
          background: '#F1F5F9',
          padding: '0.25rem',
          borderRadius: '8px'
        }}>
          {ABOUT_SUBTABS.map(tab => {
            const Icon = tab.icon;
            const isActive = currentSub === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSubTabChange(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? 'var(--accent-blue)' : 'var(--text-slate)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Landing / About Subtab Content */}
      <div style={{ flex: 1 }}>
        <LandingPage
          landingSubTab={currentSub}
          setLandingSubTab={handleSubTabChange}
          setCurrentTab={setCurrentTab}
          onNavigatePortalTab={onNavigatePortalTab}
        />
      </div>

      {/* Footer embedded at the end of About section */}
      <Footer
        setCurrentTab={setCurrentTab}
        landingSubTab={currentSub}
        navigateLandingSub={handleSubTabChange}
        onNavigatePortalTab={onNavigatePortalTab}
      />
    </div>
  );
};

export default AboutCodeArenaSection;
