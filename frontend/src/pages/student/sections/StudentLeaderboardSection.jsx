import React, { useState, useEffect } from 'react';
import { BarChart2, Trophy, Search, Radio, User } from 'lucide-react';
import api from '../../../services/api';
import ContestLeaderboard from '../../../components/common/ContestLeaderboard';
import { useSocket } from '../../../context/SocketContext';

export const StudentLeaderboardSection = ({
  contests = [],
  currentUser,
  initialContestId = null
}) => {
  const { socket, joinContest } = useSocket();

  const resolveContestId = (targetId) => {
    if (!targetId || targetId === 'global') return 'global';
    const match = contests.find(c => String(c._id) === String(targetId) || String(c.id) === String(targetId) || c.slug === targetId);
    return match ? (match._id || match.id) : targetId;
  };

  const getInitialSelectedId = () => {
    if (initialContestId) {
      return resolveContestId(initialContestId);
    }
    const live = contests.find(c => c.status !== 'Ended' && (c.status === 'Live' || c.status === 'Active' || (c.remainingSecs !== undefined && c.remainingSecs > 0)));
    if (live) return live._id || live.id;
    if (contests.length > 0) return contests[0]._id || contests[0].id;
    return 'global';
  };

  const [selectedContestId, setSelectedContestId] = useState(getInitialSelectedId);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (initialContestId) {
      setSelectedContestId(resolveContestId(initialContestId));
    }
  }, [initialContestId, contests]);

  useEffect(() => {
    fetchLeaderboard();

    if (selectedContestId && selectedContestId !== 'global') {
      joinContest(selectedContestId, {
        userId: currentUser?.id || currentUser?._id,
        userName: currentUser?.name,
        email: currentUser?.email
      });
    }
  }, [selectedContestId]);

  // Real-time WebSocket listener for live rank adjustments
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (payload) => {
      if (
        selectedContestId === 'global' || 
        (payload?.contestId && String(payload.contestId) === String(selectedContestId))
      ) {
        fetchLeaderboard();
      }
    };

    socket.on('leaderboard:update', handleUpdate);
    socket.on('leaderboard:global_update', handleUpdate);

    return () => {
      socket.off('leaderboard:update', handleUpdate);
      socket.off('leaderboard:global_update', handleUpdate);
    };
  }, [socket, selectedContestId]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const url = selectedContestId === 'global' ? '/leaderboard/rankings' : `/leaderboard/rankings?contestId=${selectedContestId}`;
      const res = await api.get(url);
      setRankings(res.data.leaderboard || []);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedContest = contests.find(c => String(c._id || c.id || c.slug) === String(selectedContestId));
  const isLiveContest = selectedContest && selectedContest.status !== 'Ended' && (selectedContest.status === 'Live' || selectedContest.status === 'Active' || (selectedContest.remainingSecs !== undefined && selectedContest.remainingSecs > 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
          Candidate Standings & Leaderboard
        </h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-slate)' }}>
          Compare scores, total solved problems, and global rankings across the platform.
        </span>
      </div>

      {/* Provisional Live Leaderboard Warning Banner */}
      {isLiveContest && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          color: '#DC2626',
          fontSize: '0.85rem',
          fontWeight: 700
        }}>
          <Radio size={16} className="pulse-icon" />
          <span>🔴 LIVE LEADERBOARD — Rankings update in real time and are provisional until contest completes.</span>
        </div>
      )}

      {/* Filter & Selector Bar */}
      <div className="glass-card" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Trophy size={16} color="var(--accent-blue)" />
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-ink)' }}>Select Standings View:</span>
          <select
            value={selectedContestId}
            onChange={e => setSelectedContestId(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#FFF', fontWeight: 600, fontSize: '0.88rem' }}
          >
            <option value="global">🌎 Global Platform Standings</option>
            {contests.map(c => (
              <option key={c._id || c.id} value={c._id || c.id}>
                🏆 {c.title} ({c.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Redesigned Leaderboard Table */}
      <ContestLeaderboard
        data={rankings}
        title={selectedContest ? selectedContest.title : "Platform Standings"}
        subtitle={selectedContestId === 'global' ? 'Global standings across all platform contests' : 'Session competitive standings'}
        isLive={isLiveContest}
        loading={loading}
        searchVal={search}
        onSearchChange={setSearch}
        currentUserId={currentUser?.id || currentUser?._id}
        currentUserEmail={currentUser?.email}
        emptyMessage="No candidate rankings recorded yet."
      />
    </div>
  );
};
