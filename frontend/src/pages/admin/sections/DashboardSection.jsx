import React from 'react';
import {
  Trophy,
  Users,
  FileCode,
  CheckCircle,
  Radio,
  Clock,
  ShieldAlert,
  ArrowRight,
  Play,
  BarChart2,
  AlertTriangle,
  FileText
} from 'lucide-react';

export const DashboardSection = ({
  analytics,
  contests = [],
  questions = [],
  usersList = [],
  submissions = [],
  onOpenWorkspace,
  onNavigateSection,
  onOpenConfirmModal
}) => {
  const liveContest = contests.find(c => c.status === 'Live' || c.remainingSecs > 0);
  const upcomingContests = contests.filter(c => c.status === 'Upcoming');
  const completedContests = contests.filter(c => c.status === 'Ended');

  const totalParticipants = usersList.filter(u => u.role === 'student').length;
  const totalSubmissions = analytics?.totalSubmissions || submissions.length || 0;

  const totalViolations = usersList.reduce((acc, u) => acc + (u.tabBlurCount || 0), 0);

  const formatSecs = (secs) => {
    if (!secs || secs <= 0) return '00:00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top 8 KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '1rem'
      }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-blue)' }}>
            <Trophy size={22} />
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{contests.length}</span>
          </div>
          <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Contests</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: liveContest ? '3px solid #DC2626' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: liveContest ? '#DC2626' : 'var(--text-secondary)' }}>
            <Radio size={22} className={liveContest ? 'pulse-icon' : ''} />
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{liveContest ? 1 : 0}</span>
          </div>
          <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Live Contests</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#D97706' }}>
            <Clock size={22} />
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{upcomingContests.length}</span>
          </div>
          <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Upcoming Contests</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803D' }}>
            <CheckCircle size={22} />
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{completedContests.length}</span>
          </div>
          <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Completed Contests</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-purple)' }}>
            <Users size={22} />
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{totalParticipants}</span>
          </div>
          <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Participants</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-cyan)' }}>
            <FileCode size={22} />
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{questions.length}</span>
          </div>
          <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Problems</div>
        </div>

        <div
          className="glass-card"
          onClick={() => onNavigateSection && onNavigateSection('submissions')}
          style={{ padding: '1.25rem', cursor: 'pointer', transition: 'transform 0.15s ease' }}
          title="Click to inspect all code submissions"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4F46E5' }}>
            <FileText size={22} />
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{totalSubmissions}</span>
          </div>
          <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Submissions</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626' }}>
            <ShieldAlert size={22} />
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{totalViolations}</span>
          </div>
          <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Integrity Violations</div>
        </div>
      </div>

      {/* Prominent Live Contest Hero Section */}
      {liveContest ? (
        <div className="glass-card" style={{
          padding: '1.75rem',
          background: 'linear-gradient(135deg, #FFFFFF 0%, rgba(254, 226, 226, 0.3) 100%)',
          borderRadius: '12px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: '#FEE2E2', color: '#DC2626', fontSize: '0.75rem', fontWeight: 800 }}>
                  ● LIVE CONTEST IN PROGRESS
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ID: #{String(liveContest._id || liveContest.id).substring(0, 8)}</span>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
                {liveContest.title}
              </h2>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block' }}>TIME REMAINING</span>
              <strong style={{ fontSize: '2rem', fontFamily: 'IBM Plex Mono, monospace', color: '#DC2626' }}>
                {formatSecs(liveContest.remainingSecs)}
              </strong>
            </div>
          </div>

          {/* Metrics Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.85rem',
            padding: '1rem',
            background: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            marginBottom: '1.25rem'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Active Users</span>
              <strong style={{ fontSize: '1.1rem', color: 'var(--accent-blue)' }}>{liveContest.participants?.length || 0}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Assigned Problems</span>
              <strong style={{ fontSize: '1.1rem', color: 'var(--text-ink)' }}>{liveContest.problems?.length || 0}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Submissions</span>
              <strong style={{ fontSize: '1.1rem', color: '#4F46E5' }}>{submissions.length || 0}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Violations</span>
              <strong style={{ fontSize: '1.1rem', color: '#D97706' }}>{totalViolations}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Disqualified</span>
              <strong style={{ fontSize: '1.1rem', color: '#DC2626' }}>
                {liveContest.participants?.filter(p => p.isDisqualified).length || 0}
              </strong>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => onOpenWorkspace(liveContest)}>
              <Radio size={14} /> Open Host Control
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigateSection('participants')}>
              <Users size={14} /> View Participants
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigateSection('live-proctoring')}>
              <ShieldAlert size={14} /> Open Proctoring
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigateSection('results-reports')}>
              <BarChart2 size={14} /> View Leaderboard
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Radio size={24} style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }} />
          <h4 style={{ margin: 0, fontWeight: 700 }}>No Active Live Contest</h4>
          <p style={{ fontSize: '0.85rem', margin: '0.2rem 0 1rem' }}>Schedule or launch a contest from the Contests section.</p>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigateSection('contests')}>
            Manage Contests
          </button>
        </div>
      )}

      {/* Recent Activity Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Submissions Feed */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileCode size={16} color="var(--accent-blue)" /> Recent Submissions
            </h4>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigateSection && onNavigateSection('submissions')} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
              View All Log
            </button>
          </div>

          {submissions.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No recent code submissions.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {submissions.slice(0, 5).map((sub, i) => (
                <div key={i} style={{ padding: '0.65rem', background: 'var(--bg-paper)', borderRadius: '6px', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: 'var(--text-ink)', display: 'block' }}>{sub.user?.name || 'Student'}</strong>
                    <span style={{ color: 'var(--text-secondary)' }}>{sub.language} — {sub.executionTime || 0}ms</span>
                  </div>
                  <span style={{ fontWeight: 700, color: sub.verdict === 'Accepted' ? '#15803D' : '#DC2626' }}>
                    {sub.verdict || 'Evaluated'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Participant Registrations */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={16} color="var(--accent-purple)" /> Recent Registrations
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {usersList.slice(0, 5).map((u, i) => (
              <div key={i} style={{ padding: '0.65rem', background: 'var(--bg-paper)', borderRadius: '6px', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: 'var(--text-ink)', display: 'block' }}>{u.name}</strong>
                  <span style={{ color: 'var(--text-secondary)' }}>{u.email}</span>
                </div>
                <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: '#E0E7FF', color: '#4F46E5', fontWeight: 700 }}>
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
