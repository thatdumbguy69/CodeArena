import React, { useState, useEffect } from 'react';
import { Download, BarChart2, Trophy, PieChart, FileText, Search } from 'lucide-react';
import api from '../../../services/api';
import { exportToExcel, exportToPDF } from '../../../utils/exportUtils';
import ContestLeaderboard from '../../../components/common/ContestLeaderboard';
import { useSocket } from '../../../context/SocketContext';

export const ResultsReportsSection = ({
  contests = [],
  analytics,
  currentUser
}) => {
  const { socket, joinContest } = useSocket();
  const [activeSubTab, setActiveSubTab] = useState('leaderboard'); // leaderboard | analytics
  const [selectedContestId, setSelectedContestId] = useState('global');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLeaderboard();

    if (selectedContestId && selectedContestId !== 'global') {
      joinContest(selectedContestId, {
        userId: currentUser?.id || currentUser?._id,
        userName: currentUser?.name
      });
    }
  }, [selectedContestId]);

  // Real-time live ranking socket listeners
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
      setLeaderboardData(res.data.leaderboard || []);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRankings = leaderboardData.filter(r =>
    !search ||
    (r.teamName && r.teamName.toLowerCase().includes(search.toLowerCase())) ||
    (r.name && r.name.toLowerCase().includes(search.toLowerCase())) ||
    (r.email && r.email.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedContest = contests.find(c => String(c._id || c.id) === String(selectedContestId));
  const contestTitle = selectedContest ? selectedContest.title : 'Global Platform Leaderboard';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
            Results, Leaderboard & Analytics Reports
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Inspect candidate scores, export reports, and analyze performance statistics.
          </span>
        </div>

        {currentUser?.role === 'admin' && activeSubTab === 'leaderboard' && (
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => exportToExcel(filteredRankings, contestTitle)}>
              <Download size={14} /> Export CSV
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => exportToPDF(filteredRankings, contestTitle)}>
              <FileText size={14} /> Export PDF
            </button>
          </div>
        )}
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveSubTab('leaderboard')}
          className="btn btn-secondary btn-sm"
          style={{
            background: activeSubTab === 'leaderboard' ? 'var(--accent-blue)' : 'transparent',
            color: activeSubTab === 'leaderboard' ? '#FFF' : 'var(--text-secondary)',
            fontWeight: activeSubTab === 'leaderboard' ? 700 : 500
          }}
        >
          <BarChart2 size={15} /> Leaderboard Rankings
        </button>

        <button
          onClick={() => setActiveSubTab('analytics')}
          className="btn btn-secondary btn-sm"
          style={{
            background: activeSubTab === 'analytics' ? 'var(--accent-blue)' : 'transparent',
            color: activeSubTab === 'analytics' ? '#FFF' : 'var(--text-secondary)',
            fontWeight: activeSubTab === 'analytics' ? 700 : 500
          }}
        >
          <PieChart size={15} /> Platform Performance Analytics
        </button>
      </div>

      {activeSubTab === 'leaderboard' && (
        <>
          {/* Contest Selector & Export Toolbar */}
          <div className="glass-card" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={16} color="var(--accent-blue)" />
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-ink)' }}>Select Session:</span>
              <select
                value={selectedContestId}
                onChange={e => setSelectedContestId(e.target.value)}
                style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#FFF', fontWeight: 600, fontSize: '0.88rem' }}
              >
                <option value="global">🌐 Global Platform Rankings</option>
                {contests.map(c => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    🏆 {c.title} ({c.status})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => exportToExcel(filteredRankings, contestTitle)}>
                <Download size={14} /> Download Excel / CSV
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => exportToPDF(filteredRankings, contestTitle)}>
                <FileText size={14} /> Download PDF
              </button>
            </div>
          </div>

          {/* Clean Redesigned Leaderboard */}
          <ContestLeaderboard
            data={leaderboardData}
            title={contestTitle}
            subtitle={selectedContestId === 'global' ? 'Global standings across all platform contests' : 'Session competitive standings & problem breakdowns'}
            isLive={selectedContest?.status === 'Live'}
            loading={loading}
            searchVal={search}
            onSearchChange={setSearch}
            currentUserId={currentUser?.id || currentUser?._id}
            currentUserEmail={currentUser?.email}
            emptyMessage="No candidate rankings found for selected contest."
          />
        </>
      )}

      {activeSubTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Overall Evaluation Metrics</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.9rem' }}>
              <div><strong>Total Submissions:</strong> {analytics?.totalSubmissions || 0}</div>
              <div><strong>Accepted Submissions:</strong> {analytics?.acceptedSubmissions || 0}</div>
              <div><strong>Global Acceptance Rate:</strong> {analytics?.passRate || 0}%</div>
              <div><strong>Registered Students:</strong> {analytics?.totalStudents || 0}</div>
              <div><strong>Total Problem Repository:</strong> {analytics?.totalQuestions || 0}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
