import React from 'react';
import { Code2, Shield, Mail, MapPin, Phone } from 'lucide-react';

export const Footer = ({ setCurrentTab, landingSubTab, navigateLandingSub }) => {
  const currentYear = new Date().getFullYear();

  const handleNav = (tab, subTab = 'home') => {
    if (setCurrentTab) {
      setCurrentTab(tab);
    } else if (navigateLandingSub) {
      navigateLandingSub(subTab);
    }
  };

  return (
    <footer style={{
      background: '#0e1117',
      borderTop: '1px solid var(--border-color)',
      padding: '2.5rem 0 1.5rem 0',
      color: '#94a3b8',
      fontSize: '0.88rem',
      marginTop: 'auto'
    }}>
      <div className="container" style={{ maxWidth: '1140px', margin: '0 auto', padding: '0 1.5rem' }}>

        {/* Top 4-Column Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '2rem',
          paddingBottom: '2rem'
        }}>

          {/* Column 1: Brand & Description */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.8rem' }}>
              <img
                src="/coders_club_logo.png"
                alt="Coders' Club Logo"
                style={{ height: '34px', width: 'auto', objectFit: 'contain' }}
              />
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>CodeArena</span>
              <span style={{
                background: '#0d224a',
                color: '#3880ff',
                padding: '0.15rem 0.55rem',
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.04em'
              }}>
                GPREC
              </span>
            </div>

            <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.86rem', margin: 0, maxWidth: '280px' }}>
              Multi-language coding assessment and contest platform, built by Coders' Club, GPREC.
            </p>
          </div>

          {/* Column 2: Platform Links */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.85rem' }}>Platform</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <span onClick={() => handleNav('problems', 'home')} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseEnter={(e) => e.target.style.color = '#3880ff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'}>Practice</span>
              <span onClick={() => handleNav('contests', 'home')} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseEnter={(e) => e.target.style.color = '#3880ff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'}>Contests</span>
              <span onClick={() => handleNav('leaderboard', 'home')} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseEnter={(e) => e.target.style.color = '#3880ff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'}>Leaderboard</span>
              <span onClick={() => navigateLandingSub ? navigateLandingSub('faqs') : null} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseEnter={(e) => e.target.style.color = '#3880ff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'}>FAQs</span>
            </div>
          </div>

          {/* Column 3: Legal & Policies */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.85rem' }}>
              <Shield size={16} color="#3880ff" />
              <span>Legal and policies</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <span onClick={() => navigateLandingSub ? navigateLandingSub('rules') : null} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseEnter={(e) => e.target.style.color = '#3880ff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'}>Rules</span>
              <span onClick={() => navigateLandingSub ? navigateLandingSub('terms') : null} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseEnter={(e) => e.target.style.color = '#3880ff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'}>Terms and conditions</span>
              <span onClick={() => navigateLandingSub ? navigateLandingSub('terms') : null} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseEnter={(e) => e.target.style.color = '#3880ff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'}>Privacy policy</span>
              <span onClick={() => navigateLandingSub ? navigateLandingSub('contact') : null} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseEnter={(e) => e.target.style.color = '#3880ff'} onMouseLeave={(e) => e.target.style.color = '#94a3b8'}>Contact us</span>
            </div>
          </div>

          {/* Column 4: Contact & Support */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.85rem' }}>Contact and support</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Phone size={16} color="#3880ff" style={{ flexShrink: 0 }} />
                <span style={{ color: '#cbd5e1' }}>SMD Tabraiz - +91 9391491123</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Mail size={16} color="#3880ff" style={{ flexShrink: 0 }} />
                <a href="mailto:codersclub@gprec.ac.in" style={{ color: '#cbd5e1', textDecoration: 'none' }}>codersclub@gprec.ac.in</a>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem' }}>
                <MapPin size={16} color="#3880ff" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                <span style={{ color: '#cbd5e1', lineHeight: 1.4 }}>
                  GPREC Campus, Nandyal Road, Kurnool, Andhra Pradesh - 518007
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Sub-footer Row */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.82rem'
        }}>
          <div>
            © {currentYear} Coders' Club, GPREC. All rights reserved.
          </div>

          <div style={{
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: 'rgba(255, 255, 255, 0.02)',
            padding: '0.35rem 0.85rem',
            borderRadius: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontWeight: 600 }}>&lt;/&gt;</span>
            <span style={{ color: '#94a3b8' }}>Developed by</span>
            <strong style={{ color: '#fff', fontWeight: 700 }}>SMD Tabraiz</strong>
            <span style={{ color: '#3880ff' }}>(Full stack developer)</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
