import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Trophy, Clock, PlusCircle, Users, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';

export const ContestList = ({ onEnterContest, setCurrentTab }) => {
  const { user } = useAuth();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'upcoming' | 'past'

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/contests');
      setContests(res.data.contests || []);
    } catch (err) {
      console.error('Error fetching contests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnterContest = async (c) => {
    const startMs = c.startTime ? new Date(c.startTime).getTime() : Date.now();
    const isUpcoming = c.status === 'Upcoming' || startMs > Date.now();
    
    try {
      const res = await api.post(`/contests/${c._id || c.slug}/session/start`).catch(() => null);
      const session = res?.data?.session || null;
      
      if (session?.isFinished) {
        alert("You have already completed this contest and cannot re-enter.");
        return;
      }

      const elapsedMs = session?.startTime ? (new Date() - new Date(session.startTime)) : 0;
      const remainingSecs = isUpcoming 
        ? ((c.duration || 60) * 60)
        : Math.max(0, (c.duration * 60) - Math.floor(elapsedMs / 1000));
      
      if (!isUpcoming && remainingSecs <= 0 && c.status === 'Ended') {
        alert("Time has expired for this contest session.");
        await api.post(`/contests/${c._id || c.slug}/session/finish`).catch(() => {});
        return;
      }

      const startsInSecs = isUpcoming ? Math.max(0, Math.floor((startMs - Date.now()) / 1000)) : 0;
      const contestWithSession = { ...c, session, remainingSecs, startsInSecs };
      onEnterContest(contestWithSession);
    } catch (err) {
      console.error('Error starting contest session:', err);
      alert(err.response?.data?.message || 'Error starting contest session');
    }
  };

  const filterContests = (tab) => {
    if (tab === 'active') {
      return contests.filter(c => !c.status || c.status === 'Active');
    }
    if (tab === 'upcoming') {
      return contests.filter(c => c.status === 'Upcoming');
    }
    if (tab === 'past') {
      return contests.filter(c => c.status === 'Ended');
    }
    return contests;
  };

  const filteredContests = filterContests(activeTab);

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Contests</h1>
          <p style={{ color: 'var(--text-slate)', fontSize: '0.88rem' }}>
            Compete in live timed contests with proctoring and real-time leaderboards.
          </p>
        </div>

        {user && user.role === 'admin' && setCurrentTab && (
          <button className="btn btn-primary btn-sm" onClick={() => setCurrentTab('admin')}>
            <PlusCircle size={14} /> Create Contest
          </button>
        )}
      </div>

      {/* Contest Status Navigation Tabs */}
      <div className="card" style={{ padding: '0.35rem', marginBottom: '1.5rem', display: 'flex', gap: '0.25rem' }}>
        {[
          { key: 'active', label: 'Active Contests' },
          { key: 'upcoming', label: 'Upcoming Contests' },
          { key: 'past', label: 'Past Contests' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === tab.key ? 'var(--accent-blue-light)' : 'transparent',
              color: activeTab === tab.key ? 'var(--accent-blue)' : 'var(--text-slate)',
              fontWeight: activeTab === tab.key ? 600 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contest Grid */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-slate)' }}>
          Loading contests...
        </div>
      ) : filteredContests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <Trophy size={40} color="var(--text-slate)" style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>No {activeTab} contests found</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-slate)' }}>
            Check back soon for new coding competitions hosted by instructors.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredContests.map((c) => (
            <div key={c._id || c.slug} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span className={`badge ${c.status === 'Ended' ? 'badge-hard' : c.status === 'Upcoming' ? 'badge-medium' : 'badge-easy'}`}>
                    {c.status || 'Active'}
                  </span>
                  <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-slate)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={13} /> {c.duration || 60} mins
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>{c.title}</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-slate)', marginBottom: '1rem', lineHeight: 1.5 }}>
                  {c.description || 'Institutional competitive programming challenge.'}
                </p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  background: 'var(--bg-paper)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1.25rem',
                  fontSize: '0.82rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-slate)' }}>Problems:</span>{' '}
                    <span style={{ fontWeight: 600 }}>{c.problems?.length || 1}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-slate)' }}>Participants:</span>{' '}
                    <span style={{ fontWeight: 600 }}>{c.participantCount || 42}</span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-slate)' }}>Start Time:</span>{' '}
                    <span className="font-mono">{c.startTime ? new Date(c.startTime).toLocaleString() : 'Immediate Access'}</span>
                  </div>
                </div>
              </div>

              <div>
                {c.status === 'Ended' ? (
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                    onClick={() => setCurrentTab('leaderboard')}
                  >
                    View Contest Leaderboard
                  </button>
                ) : c.status === 'Upcoming' ? (
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                    disabled
                  >
                    Opens Soon
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => handleEnterContest(c)}
                  >
                    Enter Contest Arena <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
