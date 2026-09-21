import React from 'react';
import { User, LogOut, CheckCircle, FileCode, Target, Award, Calendar, Mail, Shield } from 'lucide-react';

export const StudentProfileSection = ({
  user,
  stats,
  submissions = [],
  onSignOut,
  onSelectProblem
}) => {
  const s = stats?.stats || { easyCount: 0, mediumCount: 0, hardCount: 0, totalAttempted: 0, totalAccepted: 0 };
  const accuracyRate = s.totalAttempted > 0 ? Math.round((s.totalAccepted / s.totalAttempted) * 100) : 0;

  // Filter solved submissions
  const solvedSubmissions = submissions.filter(sub => sub.verdict === 'Accepted' || sub.status === 'Accepted');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '900px' }}>
      {/* Header Profile Hero Card */}
      <div className="glass-card" style={{
        padding: '2rem',
        borderRadius: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--accent-blue)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.8rem'
          }}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
          </div>

          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
              {user?.name || 'Student Candidate'}
            </h2>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem', fontSize: '0.85rem', color: 'var(--text-slate)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Mail size={14} /> {user?.email}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Shield size={14} /> Handle: {user?.teamName || user?.name}
              </span>
            </div>
          </div>
        </div>

        <button className="btn btn-secondary" onClick={onSignOut} style={{ color: '#DC2626' }}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {/* Statistics Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-slate)', fontWeight: 600, display: 'block' }}>TOTAL SCORE</span>
          <strong style={{ fontSize: '1.5rem', color: 'var(--accent-blue)' }}>{user?.score || 0} pts</strong>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-slate)', fontWeight: 600, display: 'block' }}>PROBLEMS SOLVED</span>
          <strong style={{ fontSize: '1.5rem', color: '#15803D' }}>{user?.solvedCount || s.totalAccepted || 0}</strong>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-slate)', fontWeight: 600, display: 'block' }}>TOTAL SUBMISSIONS</span>
          <strong style={{ fontSize: '1.5rem', color: 'var(--text-ink)' }}>{s.totalAttempted || submissions.length || 0}</strong>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-slate)', fontWeight: 600, display: 'block' }}>ACCURACY RATE</span>
          <strong style={{ fontSize: '1.5rem', color: 'var(--accent-purple)' }}>{accuracyRate}%</strong>
        </div>
      </div>

      {/* Solved Problems History */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Solved Problems History</h3>

        {solvedSubmissions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-slate)', fontSize: '0.9rem' }}>
            You haven't solved any problems yet. Explore the Practice Catalog to begin!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {solvedSubmissions.map((sub, idx) => (
              <div key={idx} style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-paper)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-ink)', display: 'block' }}>
                    {sub.questionTitle || 'Two Sum'}
                  </strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-slate)' }}>
                    Language: {sub.language} — Solved on {new Date(sub.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onSelectProblem(sub.questionSlug || sub.question || 'two-sum')}
                >
                  View Workspace
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
