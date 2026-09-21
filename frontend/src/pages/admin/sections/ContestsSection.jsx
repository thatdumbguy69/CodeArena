import React, { useState } from 'react';
import { Trophy, Plus, Edit, Trash2, Radio, Clock, CheckCircle, Copy, ArrowRight } from 'lucide-react';

export const ContestsSection = ({
  contests = [],
  onOpenWorkspace,
  onHostNewContest,
  onEditContest,
  onDeleteContest
}) => {
  const [filter, setFilter] = useState('All'); // All | Draft | Upcoming | Live | Completed

  const filteredContests = contests.filter(c => {
    if (filter === 'All') return true;
    if (filter === 'Live') return c.status === 'Live' || c.remainingSecs > 0;
    if (filter === 'Upcoming') return c.status === 'Upcoming';
    if (filter === 'Completed') return c.status === 'Ended';
    if (filter === 'Draft') return c.status === 'Draft';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
            Contest Management
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Schedule, manage, and monitor competitive programming contests.
          </span>
        </div>

        <button className="btn btn-primary" onClick={onHostNewContest}>
          <Trophy size={18} /> Host New Contest
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {['All', 'Draft', 'Upcoming', 'Live', 'Completed'].map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className="btn btn-secondary btn-sm"
            style={{
              background: filter === t ? 'var(--accent-blue)' : 'transparent',
              color: filter === t ? '#FFF' : 'var(--text-secondary)',
              border: filter === t ? 'none' : '1px solid var(--border-color)',
              fontWeight: filter === t ? 700 : 500
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Contest List Grid / Cards */}
      {filteredContests.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Trophy size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
          <h4 style={{ margin: 0 }}>No contests found in this view</h4>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredContests.map(c => {
            const isLive = c.status === 'Live' || c.remainingSecs > 0;
            const badgeColor = isLive ? '#DC2626' : (c.status === 'Upcoming' ? '#D97706' : '#4F46E5');

            return (
              <div
                key={c._id || c.id}
                className="glass-card"
                style={{
                  padding: '1.25rem 1.5rem',
                  borderRadius: '10px',
                  border: isLive ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  background: isLive ? 'rgba(254, 226, 226, 0.15)' : '#FFFFFF'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      background: isLive ? '#FEE2E2' : '#E0E7FF',
                      color: badgeColor
                    }}>
                      {isLive ? '● LIVE' : (c.status?.toUpperCase() || 'UPCOMING')}
                    </span>

                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
                      {c.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                    <span>📅 Start: {new Date(c.startTime || Date.now()).toLocaleDateString()}</span>
                    <span>⏱️ Duration: {c.durationMinutes || c.duration || 60}m</span>
                    <span>📝 Problems: {c.problems?.length || 0}</span>
                    <span>👥 Participants: {c.participants?.length || 0}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); onOpenWorkspace(c); }}>
                    Manage Workspace <ArrowRight size={14} />
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); onEditContest(c); }} title="Edit Contest">
                    <Edit size={14} />
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      const targetId = c._id || c.id || c.slug;
                      if (onDeleteContest && targetId) {
                        onDeleteContest(targetId);
                      }
                    }}
                    style={{ color: '#DC2626' }}
                    title="Delete Contest"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
