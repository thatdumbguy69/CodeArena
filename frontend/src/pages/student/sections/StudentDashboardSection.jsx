import React from 'react';
import {
  CheckCircle,
  Clock,
  Radio,
  FileCode,
  Trophy,
  Target,
  ArrowRight,
  TrendingUp,
  Flame,
  Award,
  Play,
  RotateCcw
} from 'lucide-react';

export const StudentDashboardSection = ({
  user,
  stats,
  submissions = [],
  contests = [],
  questions = [],
  onSelectProblem,
  onOpenContest,
  onNavigateTab
}) => {
  const s = stats?.stats || { easyCount: 0, mediumCount: 0, hardCount: 0, totalAttempted: 0, totalAccepted: 0 };
  const accuracyRate = s.totalAttempted > 0 ? Math.round((s.totalAccepted / s.totalAttempted) * 100) : 0;

  const liveContest = contests.find(c => c.status === 'Live' || c.status === 'Active' || (c.remainingSecs !== undefined && c.remainingSecs > 0));
  const upcomingContest = contests.find(c => c.status === 'Upcoming');

  const formatSecs = (secs) => {
    if (!secs || secs <= 0) return '00:00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Extract recently attempted/unfinished problems for "Continue Where You Left Off"
  const recentSubmissionsMap = {};
  submissions.forEach(sub => {
    const qSlug = sub.questionSlug || sub.question;
    if (qSlug && !recentSubmissionsMap[qSlug]) {
      recentSubmissionsMap[qSlug] = sub;
    }
  });
  const recentAttemptedList = Object.values(recentSubmissionsMap).slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. Welcome Section */}
      <div className="glass-card" style={{
        padding: '1.75rem 2rem',
        background: 'linear-gradient(135deg, #FFFFFF 0%, var(--bg-paper) 100%)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
            Welcome back, {user?.name || 'Candidate'} 👋
          </h1>
          <p style={{ color: 'var(--text-slate)', marginTop: '0.3rem', fontSize: '0.92rem' }}>
            Keep solving practice problems and compete in live contests to improve your global rank.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => onNavigateTab('practice')}>
          Explore Practice Problems <ArrowRight size={16} />
        </button>
      </div>

      {/* 2. Key Statistics KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: '1rem'
      }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803D' }}>
            <CheckCircle size={22} />
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{user?.solvedCount || s.totalAccepted || 0}</span>
          </div>
          <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-slate)' }}>Problems Solved</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4F46E5' }}>
            <FileCode size={22} />
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{s.totalAttempted || submissions.length || 0}</span>
          </div>
          <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-slate)' }}>Total Submissions</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-blue)' }}>
            <Target size={22} />
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{accuracyRate}%</span>
          </div>
          <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-slate)' }}>Acceptance Rate</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-purple)' }}>
            <Award size={22} />
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{user?.score || 0}</span>
          </div>
          <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-slate)' }}>Total Score Pts</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#D97706' }}>
            <Trophy size={22} />
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>Top Candidate</span>
          </div>
          <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-slate)' }}>Global Standing</div>
        </div>
      </div>

      {/* 3. Contest Section Hero Card */}
      {liveContest ? (
        <div className="glass-card" style={{
          padding: '1.75rem',
          background: 'linear-gradient(135deg, #FFFFFF 0%, rgba(254, 226, 226, 0.3) 100%)',
          borderRadius: '12px',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: '#FEE2E2', color: '#DC2626', fontSize: '0.75rem', fontWeight: 800 }}>
                  🔴 LIVE CONTEST IN PROGRESS
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-slate)' }}>{liveContest.participants?.length || 0} Candidates Competing</span>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
                {liveContest.title}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-slate)', display: 'block' }}>REMAINING TIME</span>
                <strong style={{ fontSize: '1.8rem', fontFamily: 'IBM Plex Mono, monospace', color: '#DC2626' }}>
                  {formatSecs(liveContest.remainingSecs)}
                </strong>
              </div>

              <button className="btn btn-primary" onClick={() => onOpenContest(liveContest)}>
                <Play size={16} /> Enter Contest Arena
              </button>
            </div>
          </div>
        </div>
      ) : upcomingContest ? (
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⏳ NEXT UPCOMING CONTEST
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.2rem 0 0', color: 'var(--text-ink)' }}>
              {upcomingContest.title}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-slate)' }}>
              Scheduled for {new Date(upcomingContest.startTime || Date.now()).toLocaleString()}
            </span>
          </div>

          <button className="btn btn-secondary" onClick={() => onNavigateTab('contests')}>
            View Contest Details <ArrowRight size={16} />
          </button>
        </div>
      ) : null}

      {/* 4. Progress Overview Grid (Easy/Medium/Hard Matrix) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-ink)' }}>
            Problem Solve Progress Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#15803D' }}>🟢 Easy Problems</span>
              <strong style={{ fontSize: '1.1rem', color: '#15803D' }}>{s.easyCount} solved</strong>
            </div>

            <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#D97706' }}>🟡 Medium Problems</span>
              <strong style={{ fontSize: '1.1rem', color: '#D97706' }}>{s.mediumCount} solved</strong>
            </div>

            <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#B91C1C' }}>🔴 Hard Problems</span>
              <strong style={{ fontSize: '1.1rem', color: '#B91C1C' }}>{s.hardCount} solved</strong>
            </div>
          </div>
        </div>

        {/* 5. "Continue Where You Left Off" Section */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-ink)' }}>
            Continue Where You Left Off
          </h3>

          {recentAttemptedList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-slate)', fontSize: '0.88rem' }}>
              No recent problem attempts. Explore the Practice Catalog to start solving!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentAttemptedList.map((item, idx) => {
                const isAcc = item.verdict === 'Accepted' || item.status === 'Accepted';
                return (
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
                        {item.questionTitle || item.question || 'Two Sum'}
                      </strong>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: isAcc ? '#15803D' : '#B91C1C'
                      }}>
                        {isAcc ? '✓ Accepted' : '● Attempted'}
                      </span>
                    </div>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onSelectProblem(item.questionSlug || item.question || 'two-sum')}
                    >
                      {isAcc ? <CheckCircle size={14} color="#15803D" /> : <RotateCcw size={14} />}
                      {isAcc ? 'Review' : 'Try Again'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
