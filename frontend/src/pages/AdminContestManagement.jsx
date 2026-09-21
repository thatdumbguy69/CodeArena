import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  ArrowLeft,
  Users,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Search,
  Clock,
  Activity,
  Download,
  Eye,
  RefreshCw,
  Zap,
  Slash,
  AlertCircle,
  Code2,
  BarChart3,
  ListOrdered,
  Settings,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

export const AdminContestManagement = ({ contestId, setCurrentTab }) => {
  const [contestsList, setContestsList] = useState([]);
  const [selectedContestId, setSelectedContestId] = useState(contestId || null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState('live'); // 'live' | 'setup' | 'post'
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Disqualify Modal State
  const [disqualifyModal, setDisqualifyModal] = useState(null);
  const [disqualifyReason, setDisqualifyReason] = useState('Excessive tab blurs during active contest');
  
  // Preview Modal State
  const [previewProblem, setPreviewProblem] = useState(null);

  useEffect(() => {
    loadContestsAndAnalytics();
  }, [contestId]);

  // Polling for live monitoring every 3 seconds if enabled
  useEffect(() => {
    let interval;
    if (autoRefresh && activePhase === 'live' && selectedContestId) {
      interval = setInterval(() => {
        fetchAnalytics(selectedContestId, true);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, activePhase, selectedContestId]);

  const loadContestsAndAnalytics = async () => {
    try {
      setLoading(true);
      const cRes = await api.get('/contests');
      const list = cRes.data.contests || [];
      setContestsList(list);

      let targetId = contestId || selectedContestId;
      if (!targetId && list.length > 0) {
        targetId = list[0]._id || list[0].slug;
      }

      if (targetId) {
        setSelectedContestId(targetId);
        await fetchAnalytics(targetId, false);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading contest list:', err);
      setLoading(false);
    }
  };

  const fetchAnalytics = async (targetId, silent = false) => {
    if (!targetId) return;
    try {
      if (!silent) setLoading(true);
      const res = await api.get(`/contests/${targetId}/analytics`);
      setData(res.data);
      
      // Default to live phase if active, otherwise setup/post
      if (!silent && res.data.contest) {
        if (res.data.contest.status === 'Ended') {
          setActivePhase('post');
        } else if (res.data.contest.status === 'Upcoming') {
          setActivePhase('setup');
        } else {
          setActivePhase('live');
        }
      }
    } catch (err) {
      console.error('Failed to fetch contest management data', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleAdjustTime = async (adjustmentMins) => {
    if (!selectedContestId) return;
    try {
      await api.put(`/contests/${selectedContestId}`, { timeAdjustmentMins: adjustmentMins });
      fetchAnalytics(selectedContestId, true);
    } catch (err) {
      alert(err.response?.data?.message || 'Error adjusting contest time');
    }
  };

  const handleEndContestEarly = async () => {
    if (!selectedContestId) return;
    if (!window.confirm('Are you sure you want to end this contest immediately? All student sessions will automatically finalize.')) return;
    try {
      await api.put(`/contests/${selectedContestId}`, { endTime: new Date(), status: 'Ended' });
      fetchAnalytics(selectedContestId, true);
    } catch (err) {
      alert(err.response?.data?.message || 'Error ending contest');
    }
  };

  const handleDisqualify = async () => {
    if (!disqualifyModal || !selectedContestId) return;
    try {
      await api.post(`/contests/${selectedContestId}/disqualify`, {
        userId: disqualifyModal.userId,
        reason: disqualifyReason
      });
      setDisqualifyModal(null);
      fetchAnalytics(selectedContestId, true);
    } catch (err) {
      alert(err.response?.data?.message || 'Error disqualifying participant');
    }
  };

  const handleExportCSV = () => {
    if (!data || !data.participants) return;
    
    const headers = ['Rank', 'Name', 'Email', 'Questions Solved', 'Total Score', 'Time Taken to Complete', 'Tab Blurs', 'Disqualified', 'Disqualification Reason'];
    const sorted = [...data.participants].sort((a, b) => b.score - a.score);
    
    const rows = sorted.map((p, idx) => [
      idx + 1,
      `"${p.name}"`,
      `"${p.email}"`,
      p.solvedCount || 0,
      p.score || 0,
      `"${p.timeTakenFormatted || '0m 0s'}"`,
      p.maxBlurCount || 0,
      p.isDisqualified ? 'YES' : 'NO',
      `"${p.disqualificationReason || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${data.contestTitle.replace(/\s+/g, '_')}_Leaderboard.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="container" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-slate)' }}>Loading Contest Control Center...</div>;
  }

  if (!data || !data.contest) {
    return (
      <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setCurrentTab('admin')} style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Admin Dashboard
        </button>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', color: 'var(--diff-hard)' }}>
          Failed to load contest details.
        </div>
      </div>
    );
  }

  const contest = data.contest;
  const participants = data.participants || [];
  const recentSubmissions = data.recentSubmissions || [];
  const problemStats = data.problemStats || [];
  const filteredParticipants = participants.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.email.toLowerCase().includes(searchTerm.toLowerCase()));

  const activeCount = participants.filter(p => !p.isFinished && !p.isDisqualified).length;
  const disqualifiedCount = participants.filter(p => p.isDisqualified).length;

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setCurrentTab('admin')}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {contestsList.length > 0 && (
            <select
              className="form-select"
              style={{ width: '220px', padding: '0.3rem 0.6rem', fontSize: '0.82rem' }}
              value={selectedContestId || ''}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedContestId(newId);
                fetchAnalytics(newId, false);
              }}
            >
              {contestsList.map(c => (
                <option key={c._id || c.slug} value={c._id || c.slug}>
                  {c.title} ({c.status || 'Active'})
                </option>
              ))}
            </select>
          )}

          <span className={`badge ${contest.status === 'Ended' ? 'badge-hard' : contest.status === 'Upcoming' ? 'badge-medium' : 'badge-easy'}`}>
            Status: {contest.status || 'Active'}
          </span>
          <button 
            className={`btn btn-sm ${autoRefresh ? 'btn-outline' : 'btn-secondary'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw size={13} className={autoRefresh ? 'spin' : ''} />
            {autoRefresh ? 'Live Auto-Sync (3s)' : 'Paused'}
          </button>
        </div>
      </div>

      {/* Header Info */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 600, marginBottom: '0.2rem' }}>
          Contest Host Control Center: {contest.title}
        </h1>
        <p style={{ color: 'var(--text-slate)', fontSize: '0.88rem' }}>
          Real-time proctoring, live leaderboard, problem diagnostics, and post-contest reports.
        </p>
      </div>

      {/* 3-Phase Navigation Tabs */}
      <div className="card" style={{ padding: '0.35rem', marginBottom: '1.75rem', display: 'flex', gap: '0.25rem' }}>
        <button
          onClick={() => setActivePhase('live')}
          style={{
            flex: 1,
            padding: '0.55rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activePhase === 'live' ? 'var(--accent-blue-light)' : 'transparent',
            color: activePhase === 'live' ? 'var(--accent-blue)' : 'var(--text-slate)',
            fontWeight: activePhase === 'live' ? 600 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}
        >
          <Activity size={15} /> 1. Live Monitoring (Active Host)
        </button>

        <button
          onClick={() => setActivePhase('setup')}
          style={{
            flex: 1,
            padding: '0.55rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activePhase === 'setup' ? 'var(--accent-blue-light)' : 'transparent',
            color: activePhase === 'setup' ? 'var(--accent-blue)' : 'var(--text-slate)',
            fontWeight: activePhase === 'setup' ? 600 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}
        >
          <Settings size={15} /> 2. Pre-Contest Setup &amp; Preview
        </button>

        <button
          onClick={() => setActivePhase('post')}
          style={{
            flex: 1,
            padding: '0.55rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activePhase === 'post' ? 'var(--accent-blue-light)' : 'transparent',
            color: activePhase === 'post' ? 'var(--accent-blue)' : 'var(--text-slate)',
            fontWeight: activePhase === 'post' ? 600 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}
        >
          <BarChart3 size={15} /> 3. Post-Contest Analytics &amp; Export
        </button>
      </div>

      {/* ==================== PHASE 1: LIVE MONITORING ==================== */}
      {activePhase === 'live' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Admin Real-Time Timing Control Bar */}
          <div className="card" style={{ padding: '1.1rem 1.4rem', background: 'var(--bg-paper)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-ink)' }}>
                  <Clock size={16} color="var(--accent-blue)" /> Admin Real-Time Timing Control
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-slate)', marginTop: '0.2rem' }}>
                  Wall-Clock Sync: <strong>Start:</strong> {contest.startTime ? new Date(contest.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'} | <strong>End:</strong> {contest.endTime ? new Date(contest.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'} ({contest.duration || 60} mins total)
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-slate)', fontWeight: 600 }}>Adjust Time:</span>
                <button className="btn btn-secondary btn-sm" onClick={() => handleAdjustTime(15)}>
                  +15 Mins
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleAdjustTime(30)}>
                  +30 Mins
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleAdjustTime(-10)}>
                  -10 Mins
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleEndContestEarly}>
                  End Contest Now
                </button>
              </div>
            </div>
          </div>

          {/* Top Live Health Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
            
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <Users size={24} color="var(--accent-blue)" />
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-ink)' }}>
                  {activeCount} / {participants.length}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-slate)' }}>Active vs Registered</div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <Clock size={24} color="var(--diff-medium)" />
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-ink)' }}>
                  {contest.duration || 60} Mins
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-slate)' }}>Contest Duration</div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <Zap size={24} color="var(--diff-easy)" />
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--diff-easy)' }}>
                  0 Queued • 140ms
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-slate)' }}>Worker Pool Health</div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <ShieldAlert size={24} color={disqualifiedCount > 0 ? 'var(--diff-hard)' : 'var(--text-slate)'} />
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: disqualifiedCount > 0 ? 'var(--diff-hard)' : 'var(--text-ink)' }}>
                  {disqualifiedCount} Flagged
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-slate)' }}>Disqualified Users</div>
              </div>
            </div>

          </div>

          {/* Grid Layout: Live Leaderboard (Left) + Live Submission Feed (Right) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
            
            {/* Live Leaderboard Table */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Live Leaderboard</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-slate)' }} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search student..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      style={{ paddingLeft: '30px', width: '160px', fontSize: '0.82rem' }}
                    />
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => exportToExcel(participants, contest.title)}
                    title="Export Live Leaderboard to Excel"
                  >
                    <FileSpreadsheet size={13} color="#1D6F42" /> Download Excel
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => exportToPDF(participants, contest.title)}
                    title="Export Live Leaderboard report to PDF"
                  >
                    <FileText size={13} color="#E1251B" /> Download PDF
                  </button>
                </div>
              </div>

              {filteredParticipants.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-slate)', fontSize: '0.88rem' }}>
                  No participants registered yet.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Team / Student Name</th>
                      <th>Solved</th>
                      <th>Score</th>
                      <th>Time Taken</th>
                      <th>Proctor Flags</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.sort((a, b) => b.score - a.score).map((p, idx) => (
                      <tr key={p.userId} style={{ background: p.isDisqualified ? 'var(--diff-hard-bg)' : 'transparent' }}>
                        <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>#{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-ink)' }}>{p.teamName || p.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-slate)' }}>{p.name} ({p.email})</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.solvedCount || 0}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>
                          {p.isDisqualified ? 0 : p.score}
                        </td>
                        <td className="font-mono" style={{ fontSize: '0.82rem' }}>
                          {p.timeTakenFormatted || '0m 0s'}
                        </td>
                        <td>
                          {p.isDisqualified ? (
                            <span className="badge badge-hard">Disqualified</span>
                          ) : p.maxBlurCount === 0 ? (
                            <span className="badge badge-easy">Clean (0)</span>
                          ) : (
                            <span className="badge badge-medium">{p.maxBlurCount} Blurs</span>
                          )}
                        </td>
                        <td>
                          {!p.isDisqualified && (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--diff-hard)', padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                              onClick={() => setDisqualifyModal(p)}
                            >
                              Disqualify
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Live Submission Feed */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Activity size={16} color="var(--accent-blue)" /> Live Submission Stream
              </h3>

              {recentSubmissions.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-slate)', fontSize: '0.85rem' }}>
                  No incoming submissions yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '420px', overflowY: 'auto' }}>
                  {recentSubmissions.map((s) => {
                    const isAccepted = s.verdict === 'Accepted';
                    return (
                      <div
                        key={s._id}
                        style={{
                          padding: '0.6rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          background: isAccepted ? 'var(--diff-easy-bg)' : 'var(--bg-paper)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.82rem'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.userName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-slate)' }}>{s.questionTitle}</div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span className={`badge ${isAccepted ? 'badge-easy' : 'badge-hard'}`}>
                            {s.verdict}
                          </span>
                          <div className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-slate)', marginTop: '0.2rem' }}>
                            {s.executionTime ? `${s.executionTime}s` : '0.1s'} • {new Date(s.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Diagnostic Problem Pass Rates */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>
              Per-Problem Health &amp; Diagnostic Pass Rates
            </h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Problem Title</th>
                  <th>Difficulty</th>
                  <th>Total Submissions</th>
                  <th>Passed Submissions</th>
                  <th>Pass Rate %</th>
                  <th>Avg Attempts</th>
                  <th>Diagnostic Alert</th>
                </tr>
              </thead>
              <tbody>
                {problemStats.map((ps) => (
                  <tr key={ps.questionId}>
                    <td style={{ fontWeight: 600 }}>{ps.title}</td>
                    <td>
                      <span className={`badge ${ps.difficulty === 'Hard' ? 'badge-hard' : ps.difficulty === 'Medium' ? 'badge-medium' : 'badge-easy'}`}>
                        {ps.difficulty}
                      </span>
                    </td>
                    <td className="font-mono">{ps.totalSubmissions}</td>
                    <td className="font-mono">{ps.passedSubmissions}</td>
                    <td className="font-mono" style={{ fontWeight: 600, color: ps.passRate < 20 && ps.totalSubmissions > 3 ? 'var(--diff-hard)' : 'var(--text-ink)' }}>
                      {ps.passRate}%
                    </td>
                    <td className="font-mono">{ps.avgAttempts}</td>
                    <td>
                      {ps.passRate < 20 && ps.totalSubmissions > 3 ? (
                        <span className="badge badge-hard"><AlertTriangle size={12} /> Low Pass Rate (Check Test Cases)</span>
                      ) : (
                        <span className="badge badge-easy"><CheckCircle2 size={12} /> Healthy</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ==================== PHASE 2: PRE-CONTEST SETUP & PREVIEW ==================== */}
      {activePhase === 'setup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Contest Metadata &amp; Configuration</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-slate)', textTransform: 'uppercase' }}>Title</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{contest.title}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-slate)', textTransform: 'uppercase' }}>Duration</div>
                <div className="font-mono" style={{ fontWeight: 600 }}>{contest.duration} Minutes</div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-slate)', textTransform: 'uppercase' }}>Start Time</div>
                <div className="font-mono" style={{ fontWeight: 600 }}>{new Date(contest.startTime).toLocaleString()}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-slate)', textTransform: 'uppercase' }}>Anti-Cheat Proctoring</div>
                <div style={{ fontWeight: 600 }}>
                  <span className={`badge ${contest.antiCheatEnabled ? 'badge-easy' : 'badge-hard'}`}>
                    {contest.antiCheatEnabled ? 'Active (Tab Switch & Blur Tracking ON)' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-slate)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Description</div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-slate)', margin: 0 }}>
                {contest.description || 'Institutional coding assessment challenge.'}
              </p>
            </div>
          </div>

          {/* Assigned Problems List */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Assigned Problem Set ({contest.problems?.length || 0})</h3>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Difficulty</th>
                  <th>Category</th>
                  <th>Points</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(contest.problems || []).map((p) => (
                  <tr key={p._id || p.slug}>
                    <td style={{ fontWeight: 600 }}>{p.title}</td>
                    <td>
                      <span className={`badge ${p.difficulty === 'Hard' ? 'badge-hard' : p.difficulty === 'Medium' ? 'badge-medium' : 'badge-easy'}`}>
                        {p.difficulty}
                      </span>
                    </td>
                    <td>{p.category || 'Algorithms'}</td>
                    <td className="font-mono">{p.points || 100} pts</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => setPreviewProblem(p)}>
                        <Eye size={13} /> Test Run / Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ==================== PHASE 3: POST-CONTEST ANALYTICS & EXPORT ==================== */}
      {activePhase === 'post' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Official Contest Leaderboard &amp; Audit Report</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-slate)', margin: 0 }}>
                Export final ranks and proctoring logs for certificates and departmental records.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => exportToExcel(participants, contest.title)}>
                <FileSpreadsheet size={16} /> Download Excel
              </button>
              <button className="btn btn-primary" onClick={() => exportToPDF(participants, contest.title)}>
                <FileText size={16} /> Download PDF
              </button>
            </div>
          </div>

          {/* Final Leaderboard */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>Final Rankings</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team / Student Name</th>
                  <th>Email</th>
                  <th>Solved Count</th>
                  <th>Total Score</th>
                  <th>Time Taken to Complete</th>
                  <th>Proctor Warnings</th>
                  <th>Final Verdict</th>
                </tr>
              </thead>
              <tbody>
                {[...participants].sort((a, b) => b.score - a.score).map((p, idx) => (
                  <tr key={p.userId} style={{ background: p.isDisqualified ? 'var(--diff-hard-bg)' : 'transparent' }}>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>#{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-ink)' }}>{p.teamName || p.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-slate)' }}>{p.name}</div>
                    </td>
                    <td style={{ color: 'var(--text-slate)' }}>{p.email}</td>
                    <td style={{ fontWeight: 600 }}>{p.solvedCount || 0}</td>
                    <td className="font-mono" style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>
                      {p.isDisqualified ? 0 : p.score}
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.85rem' }}>
                      {p.timeTakenFormatted || '0m 0s'}
                    </td>
                    <td>{p.maxBlurCount || 0} Blurs</td>
                    <td>
                      {p.isDisqualified ? (
                        <span className="badge badge-hard">Disqualified ({p.disqualificationReason})</span>
                      ) : (
                        <span className="badge badge-easy">Passed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Disqualify Modal */}
      {disqualifyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--diff-hard)', marginBottom: '0.5rem' }}>
              Disqualify Participant
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-slate)', marginBottom: '1rem' }}>
              You are about to disqualify <strong>{disqualifyModal.name}</strong> ({disqualifyModal.email}). This will reset their score to 0 and terminate their contest session.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.3rem' }}>Disqualification Reason</label>
              <input
                type="text"
                className="form-input"
                value={disqualifyReason}
                onChange={e => setDisqualifyReason(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setDisqualifyModal(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" style={{ background: 'var(--diff-hard)', borderColor: 'var(--diff-hard)' }} onClick={handleDisqualify}>
                Confirm Disqualification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewProblem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '650px', maxHeight: '80vh', overflowY: 'auto', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Test Run Preview: {previewProblem.title}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setPreviewProblem(null)}>Close</button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <span className={`badge ${previewProblem.difficulty === 'Hard' ? 'badge-hard' : previewProblem.difficulty === 'Medium' ? 'badge-medium' : 'badge-easy'}`}>
                {previewProblem.difficulty}
              </span>
              <span className="font-mono" style={{ marginLeft: '0.5rem', fontSize: '0.82rem', color: 'var(--text-slate)' }}>
                Category: {previewProblem.category || 'Algorithms'}
              </span>
            </div>

            <div style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-slate)', marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>
              {previewProblem.description}
            </div>

            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Test Cases ({previewProblem.testCases?.length || 0})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(previewProblem.testCases || []).map((tc, idx) => (
                <div key={idx} style={{ padding: '0.65rem', background: 'var(--bg-paper)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Test Case #{idx + 1} {tc.isHidden && '(Hidden)'}</div>
                  <div><strong>Input:</strong> <code className="font-mono">{tc.input}</code></div>
                  <div><strong>Output:</strong> <code className="font-mono">{tc.expectedOutput}</code></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
