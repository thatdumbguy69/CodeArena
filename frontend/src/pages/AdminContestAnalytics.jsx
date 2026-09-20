import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ArrowLeft, Users, ShieldAlert, CheckCircle2, AlertTriangle, Search, Clock } from 'lucide-react';

export const AdminContestAnalytics = ({ contestId, setCurrentTab }) => {
  const id = contestId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [id]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/contests/${id}/analytics`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>Loading Analytics...</div>;
  }

  if (!data) {
    return <div className="container" style={{ padding: '4rem', textAlign: 'center', color: '#ff5252' }}>Failed to load contest analytics.</div>;
  }

  const filteredParticipants = data.participants.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.email.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
      <button className="btn btn-secondary btn-sm" onClick={() => setCurrentTab('admin')} style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Contest Analytics</h1>
          <p style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{data.contestTitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem 1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Users size={20} color="var(--accent-purple)" />
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{data.participants.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Participants</div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Participant Leaderboard & Anti-Cheat Status</h3>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search student..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '35px', width: '250px' }}
            />
          </div>
        </div>

        {filteredParticipants.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No participants match your search.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.82rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '1rem 1.2rem' }}>Student Name</th>
                  <th style={{ padding: '1rem 1.2rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.2rem' }}>Questions Solved</th>
                  <th style={{ padding: '1rem 1.2rem' }}>Total Score</th>
                  <th style={{ padding: '1rem 1.2rem', textAlign: 'right' }}>Plagiarism / Blur Flags</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.sort((a,b) => b.score - a.score).map((p, idx) => (
                  <tr key={p.userId} style={{ borderBottom: '1px solid var(--border-color)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '1rem 1.2rem' }}>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{p.email}</div>
                    </td>
                    <td style={{ padding: '1rem 1.2rem' }}>
                      {p.isFinished ? (
                        <span className="badge badge-easy"><CheckCircle2 size={12} /> Finished</span>
                      ) : (
                        <span className="badge badge-medium"><Clock size={12} /> In Progress</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.2rem', fontWeight: 600 }}>{p.solvedCount}</td>
                    <td style={{ padding: '1rem 1.2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{p.score}</td>
                    <td style={{ padding: '1rem 1.2rem', textAlign: 'right' }}>
                      {p.maxBlurCount === 0 ? (
                        <span className="badge badge-passed"><ShieldAlert size={12} /> Clean (0)</span>
                      ) : (
                        <span className="badge badge-wrong"><AlertTriangle size={12} /> {p.maxBlurCount} Tab Blurs</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
