import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { RefreshCw, FileSpreadsheet, FileText, Trophy } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import ContestLeaderboard from '../components/common/ContestLeaderboard';

export const Leaderboard = ({ setCurrentTab }) => {
  const { user } = useAuth();
  const { socket, joinContest } = useSocket();
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [contests, setContests] = useState([]);
  const [selectedContest, setSelectedContest] = useState('global');

  useEffect(() => {
    fetchContests();
  }, []);

  useEffect(() => {
    fetchLeaderboard();

    if (selectedContest && selectedContest !== 'global') {
      joinContest(selectedContest, {
        userId: user?.id || user?._id,
        userName: user?.name,
        email: user?.email
      });
    }
  }, [selectedContest]);

  // Real-time live ranking socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (payload) => {
      if (
        selectedContest === 'global' ||
        (payload?.contestId && String(payload.contestId) === String(selectedContest))
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
  }, [socket, selectedContest]);

  const fetchContests = async () => {
    try {
      const res = await api.get('/contests');
      const list = res.data.contests || [];
      setContests(list);
      if (list.length > 0) {
        const activeOrFirst = list.find(c => c.status === 'Active' || c.status === 'Live') || list[0];
        if (activeOrFirst && activeOrFirst._id) {
          setSelectedContest(activeOrFirst._id);
        }
      }
    } catch (err) {
      console.error('Error fetching contests:', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/leaderboard/rankings?contestId=${selectedContest}`);
      setRankings(res.data.leaderboard || []);
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentContestObj = contests.find(c => String(c._id) === String(selectedContest));
  const currentTitle = selectedContest === 'global' ? 'Global Platform Leaderboard' : (currentContestObj ? currentContestObj.title : 'Contest Leaderboard');

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>Leaderboard & Standings</h1>
          <p style={{ color: 'var(--text-slate)', fontSize: '0.88rem', margin: '0.25rem 0 0 0' }}>
            {selectedContest === 'global'
              ? 'Global rankings based on total problem points achieved across all challenges.'
              : `Contest Leaderboard: ${currentContestObj ? currentContestObj.title : 'Assessment Performance'}`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          {/* Admin-Only Leaderboard Export Buttons */}
          {user && user.role === 'admin' && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => exportToExcel(rankings, currentTitle)}
                title="Download Leaderboard Excel"
              >
                <FileSpreadsheet size={14} color="#1D6F42" /> Download Excel
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => exportToPDF(rankings, currentTitle)}
                title="Download Leaderboard PDF"
              >
                <FileText size={14} color="#E1251B" /> Download PDF
              </button>
            </>
          )}

          <button className="btn btn-secondary btn-sm" onClick={fetchLeaderboard}>
            <RefreshCw size={14} /> Refresh Ranks
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Trophy size={16} color="var(--accent-blue)" />
        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-ink)' }}>Select Contest / Session:</span>
        <select 
          className="form-select" 
          value={selectedContest}
          onChange={(e) => setSelectedContest(e.target.value)}
          style={{ maxWidth: '320px', fontWeight: 600 }}
        >
          <option value="global">🌐 Global Platform Leaderboard</option>
          {contests.map(c => (
            <option key={c._id} value={c._id}>
              🏆 {c.title} ({c.status})
            </option>
          ))}
        </select>
      </div>

      {/* Redesigned Leaderboard Component */}
      <ContestLeaderboard
        data={rankings}
        title={currentTitle}
        subtitle={selectedContest === 'global' ? 'Code • Compete • Learn • Grow' : `Contest Session: ${currentContestObj ? currentContestObj.title : ''}`}
        isLive={currentContestObj?.status === 'Live' || currentContestObj?.status === 'Active'}
        loading={loading}
        searchVal={search}
        onSearchChange={setSearch}
        currentUserId={user?.id || user?._id}
        currentUserEmail={user?.email}
        emptyMessage="No rankings recorded yet. Submit solved problems to appear on the leaderboard."
      />

    </div>
  );
};
