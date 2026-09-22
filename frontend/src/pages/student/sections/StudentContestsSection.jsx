import React, { useState } from 'react';
import { Trophy, Clock, Radio, CheckCircle, ArrowRight, Play, Eye, Lock } from 'lucide-react';

export const StudentContestsSection = ({
  contests = [],
  onOpenContest
}) => {
  const [activeTab, setActiveTab] = useState('All'); // All | Live | Upcoming | Completed
  const [currentTime, setCurrentTime] = useState(Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredContests = contests.filter(c => {
    const startMs = c.startTime ? new Date(c.startTime).getTime() : 0;
    const endMs = c.endTime ? new Date(c.endTime).getTime() : Infinity;
    const isEnded = c.status === 'Ended' || endMs <= currentTime;
    const isUpcoming = !isEnded && (c.status === 'Upcoming' || startMs > currentTime);
    const isLive = !isEnded && !isUpcoming;

    if (activeTab === 'All') return true;
    if (activeTab === 'Live') return isLive;
    if (activeTab === 'Upcoming') return isUpcoming;
    if (activeTab === 'Completed') return isEnded;
    return true;
  });

  const formatSecs = (secs) => {
    if (!secs || secs <= 0) return '00:00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
          Competitive Programming Contests
        </h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-slate)' }}>
          Compete in timed programming rounds with real-time proctoring and live leaderboards.
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {['All', 'Live', 'Upcoming', 'Completed'].map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className="btn btn-secondary btn-sm"
            style={{
              background: activeTab === t ? 'var(--accent-blue)' : 'transparent',
              color: activeTab === t ? '#FFF' : 'var(--text-slate)',
              fontWeight: activeTab === t ? 700 : 500
            }}
          >
            {t === 'Live' ? '🔴 Live Contests' : t}
          </button>
        ))}
      </div>

      {/* Contest Cards */}
      {filteredContests.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-slate)' }}>
          <Trophy size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
          <h4 style={{ margin: 0 }}>No contests available in this view.</h4>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredContests.map(c => {
            const startMs = c.startTime ? new Date(c.startTime).getTime() : currentTime;
            const endMs = c.endTime ? new Date(c.endTime).getTime() : (startMs + (c.duration || 60) * 60000);
            const isEnded = c.status === 'Ended' || endMs <= currentTime;
            const isUpcoming = !isEnded && (c.status === 'Upcoming' || startMs > currentTime);
            const isLive = !isEnded && !isUpcoming;
            const badgeColor = isLive ? '#DC2626' : (isEnded ? '#4F46E5' : '#D97706');

            const liveRemSecs = c.endTime ? Math.max(0, Math.floor((endMs - currentTime) / 1000)) : (c.remainingSecs || 0);
            const startsInSecs = c.startTime ? Math.max(0, Math.floor((startMs - currentTime) / 1000)) : (c.startsInSecs || 0);

            return (
              <div
                key={c._id || c.id}
                className="glass-card"
                style={{
                  padding: '1.5rem',
                  borderRadius: '10px',
                  border: isLive ? '1px solid rgba(239, 68, 68, 0.4)' : isUpcoming ? '1px solid #FCD34D' : '1px solid var(--border-color)',
                  background: isLive ? 'rgba(254, 226, 226, 0.15)' : isUpcoming ? 'rgba(254, 243, 199, 0.25)' : '#FFFFFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      background: isLive ? '#FEE2E2' : isUpcoming ? '#FEF3C7' : '#E0E7FF',
                      color: badgeColor
                    }}>
                      {isLive ? '🔴 LIVE NOW' : (isEnded ? '✓ ENDED' : '⏳ UPCOMING')}
                    </span>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
                      {c.title}
                    </h3>
                  </div>

                  <p style={{ color: 'var(--text-slate)', fontSize: '0.88rem', margin: '0.2rem 0 0.5rem' }}>
                    {c.description || 'Timed competitive programming contest session.'}
                  </p>

                  <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem', color: 'var(--text-slate)', flexWrap: 'wrap' }}>
                    <span>📅 Start: {new Date(c.startTime || Date.now()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    <span>🏁 End: {c.endTime ? new Date(c.endTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Flexible'}</span>
                    <span>⏱️ Duration: {c.durationMinutes || c.duration || 60} mins</span>
                    {!isUpcoming && <span>📝 Problems: {c.problems?.length || 0}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {isLive && (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-slate)', display: 'block' }}>REMAINING</span>
                      <strong style={{ fontSize: '1.3rem', fontFamily: 'IBM Plex Mono, monospace', color: '#DC2626' }}>
                        {formatSecs(liveRemSecs)}
                      </strong>
                    </div>
                  )}

                  {isUpcoming && (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#D97706', display: 'block' }}>STARTS IN</span>
                      <strong style={{ fontSize: '1.3rem', fontFamily: 'IBM Plex Mono, monospace', color: '#D97706' }}>
                        {formatSecs(startsInSecs)}
                      </strong>
                    </div>
                  )}

                  {isLive ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => onOpenContest(c)}
                    >
                      <Play size={16} /> Enter Contest Arena
                    </button>
                  ) : isUpcoming ? (
                    <button
                      className="btn btn-primary"
                      style={{ background: '#D97706', borderColor: '#D97706' }}
                      onClick={() => onOpenContest(c)}
                    >
                      <Play size={16} /> Enter Waiting Lobby
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      onClick={() => onOpenContest(c)}
                    >
                      <Trophy size={16} /> View Results
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
