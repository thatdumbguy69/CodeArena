import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, XCircle, Clock, Eye, Radio, Download, Filter, RefreshCw, Zap, ChevronDown, Trash2 } from 'lucide-react';
import { ParticipantDetailsModal } from '../../../components/admin/modals/ParticipantDetailsModal';
import { exportProctoringToExcel, exportProctoringToPDF } from '../../../utils/exportUtils';
import { useSocket } from '../../../context/SocketContext';
import api from '../../../services/api';

export const LiveProctoringSection = ({
  contests = [],
  usersList = [],
  onDisqualifyParticipant
}) => {
  const { socket, isConnected, joinAdminProctoring, emitDisqualify, emitQualify } = useSocket();
  const [selectedContestId, setSelectedContestId] = useState('all');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [liveCandidates, setLiveCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const activeContest = contests.find(c => String(c._id || c.id) === String(selectedContestId));
  const liveContest = contests.find(c => c.status === 'Live' || c.remainingSecs > 0);

  const fetchProctoringData = async () => {
    try {
      if (selectedContestId === 'all') {
        const res = await api.get('/contests/proctoring/summary').catch(() => null);
        if (res?.data?.candidates) {
          setLiveCandidates(res.data.candidates);
        } else {
          const students = usersList.filter(u => u.role === 'student' || u.role !== 'admin');
          setLiveCandidates(students.map(s => ({
            ...s,
            contestTitle: 'All Contests Summary',
            tabBlurCount: s.tabBlurCount || 0,
            maxAllowedBlurs: 3,
            isDisqualified: s.isDisqualified || false,
            severityLabel: s.isDisqualified ? 'DISQUALIFIED' : (s.tabBlurCount > 0 ? 'WARNING' : 'NORMAL')
          })));
        }
      } else if (selectedContestId) {
        const res = await api.get(`/contests/${selectedContestId}/analytics`).catch(() => null);
        if (res?.data?.participants) {
          const contestTitle = res.data.contestTitle || activeContest?.title || 'Contest';
          const maxBlurs = res.data.contest?.maxAllowedBlurs || activeContest?.maxAllowedBlurs || 3;
          const mapped = res.data.participants.map(p => {
            const blurs = p.tabBlurCount !== undefined ? p.tabBlurCount : (p.maxBlurCount || 0);
            const isDisq = p.isDisqualified || blurs >= maxBlurs;
            return {
              _id: p.userId || p._id || p.id,
              userId: p.userId || p._id || p.id,
              name: p.name || 'Student',
              teamName: p.teamName || p.name || 'Team',
              email: p.email || 'N/A',
              contestId: selectedContestId,
              contestTitle,
              tabBlurCount: blurs,
              maxAllowedBlurs: maxBlurs,
              isDisqualified: isDisq,
              disqualificationReason: p.disqualificationReason || '',
              severityLabel: isDisq ? 'DISQUALIFIED' : (blurs > 0 ? 'WARNING' : 'NORMAL'),
              antiCheatLogs: p.antiCheatLogs || [],
              startTime: p.startTime
            };
          });
          setLiveCandidates(mapped);
        }
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Fetch proctoring data error:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchProctoringData().finally(() => setLoading(false));

    // Initial join to admin proctoring websocket room
    joinAdminProctoring();

    // Fallback sync polling every 10 seconds
    const timer = setInterval(() => {
      fetchProctoringData();
    }, 10000);

    return () => clearInterval(timer);
  }, [selectedContestId]);

  // Real-Time WebSocket Event Listeners
  useEffect(() => {
    if (!socket) return;

    joinAdminProctoring();

    const handleViolation = (data) => {
      const { userId, blurCount, maxAllowedBlurs, isDisqualified, disqualificationReason, event, contestId, contestTitle, timestamp } = data;
      setLiveCandidates(prev => {
        const idx = prev.findIndex(c => String(c.userId || c._id) === String(userId));
        const maxBlurs = maxAllowedBlurs || 3;
        const isDisq = isDisqualified || blurCount >= maxBlurs;
        const newLog = { event: event || `Tab Switch Violation #${blurCount}`, timestamp: timestamp || new Date() };

        if (idx >= 0) {
          const updated = [...prev];
          const existing = updated[idx];
          updated[idx] = {
            ...existing,
            tabBlurCount: blurCount,
            isDisqualified: isDisq,
            disqualificationReason: disqualificationReason || existing.disqualificationReason,
            severityLabel: isDisq ? 'DISQUALIFIED' : (blurCount > 0 ? 'WARNING' : 'NORMAL'),
            antiCheatLogs: [...(existing.antiCheatLogs || []), newLog]
          };
          return updated;
        } else {
          return [{
            _id: userId,
            userId,
            name: data.name || 'Candidate',
            teamName: data.teamName || data.name || 'Team',
            email: data.email || 'N/A',
            contestId,
            contestTitle: contestTitle || activeContest?.title || 'Contest',
            tabBlurCount: blurCount,
            maxAllowedBlurs: maxBlurs,
            isDisqualified: isDisq,
            disqualificationReason: disqualificationReason || '',
            severityLabel: isDisq ? 'DISQUALIFIED' : (blurCount > 0 ? 'WARNING' : 'NORMAL'),
            antiCheatLogs: [newLog],
            startTime: new Date()
          }, ...prev];
        }
      });
      setLastRefreshed(new Date());
    };

    const handleStudentJoined = (data) => {
      setLiveCandidates(prev => {
        if (prev.some(c => String(c.userId || c._id) === String(data.userId))) return prev;
        return [{
          _id: data.userId,
          userId: data.userId,
          name: data.name || 'Candidate',
          teamName: data.teamName || data.name || 'Team',
          email: data.email || 'N/A',
          contestId: data.contestId,
          contestTitle: activeContest?.title || 'Contest',
          tabBlurCount: 0,
          maxAllowedBlurs: 3,
          isDisqualified: false,
          severityLabel: 'NORMAL',
          antiCheatLogs: [{ event: 'Joined Contest Workspace', timestamp: data.joinedAt || new Date() }],
          startTime: data.joinedAt || new Date()
        }, ...prev];
      });
      setLastRefreshed(new Date());
    };

    const handleStudentDisqualified = (data) => {
      setLiveCandidates(prev => prev.map(c => {
        if (String(c.userId || c._id) === String(data.userId)) {
          return {
            ...c,
            isDisqualified: true,
            disqualificationReason: data.reason || 'Manual Admin Disqualification',
            severityLabel: 'DISQUALIFIED',
            antiCheatLogs: [...(c.antiCheatLogs || []), { event: 'Disqualified by Administrator', timestamp: data.timestamp || new Date() }]
          };
        }
        return c;
      }));
      setLastRefreshed(new Date());
    };

    const handleStudentQualified = (data) => {
      setLiveCandidates(prev => prev.map(c => {
        if (String(c.userId || c._id) === String(data.userId)) {
          return {
            ...c,
            isDisqualified: false,
            disqualificationReason: '',
            tabBlurCount: 0,
            severityLabel: 'NORMAL',
            antiCheatLogs: [...(c.antiCheatLogs || []), { event: 'Qualified / Reinstated by Administrator', timestamp: data.timestamp || new Date() }]
          };
        }
        return c;
      }));
      setLastRefreshed(new Date());
    };

    socket.on('proctoring:violation', handleViolation);
    socket.on('proctoring:student_joined', handleStudentJoined);
    socket.on('proctoring:student_disqualified', handleStudentDisqualified);
    socket.on('proctoring:student_qualified', handleStudentQualified);

    return () => {
      socket.off('proctoring:violation', handleViolation);
      socket.off('proctoring:student_joined', handleStudentJoined);
      socket.off('proctoring:student_disqualified', handleStudentDisqualified);
      socket.off('proctoring:student_qualified', handleStudentQualified);
    };
  }, [socket, selectedContestId]);

  const handleDisqualify = async (candidate) => {
    const uId = String(candidate.userId?._id || candidate.userId || candidate._id || candidate.id || '');
    const rawCId = candidate.contestId?._id || candidate.contestId || (selectedContestId !== 'all' ? selectedContestId : '');
    const cId = rawCId ? String(rawCId) : '';

    if (!uId) {
      alert('Unable to identify participant ID.');
      return;
    }
    if (!window.confirm(`Are you sure you want to disqualify ${candidate.name || 'this participant'}?`)) return;

    try {
      emitDisqualify({
        contestId: cId || undefined,
        userId: uId,
        reason: 'Manual Admin Disqualification from Live Proctoring'
      });

      if (cId) {
        await api.post(`/contests/${cId}/disqualify`, {
          userId: uId,
          reason: 'Manual Admin Disqualification from Live Proctoring'
        }).catch(() => {});
      }
      if (onDisqualifyParticipant) {
        onDisqualifyParticipant(uId);
      }

      // Optimistic UI updates
      setLiveCandidates(prev => prev.map(c => {
        const thisUId = String(c.userId?._id || c.userId || c._id || c.id || '');
        if (thisUId === uId) {
          return {
            ...c,
            isDisqualified: true,
            severityLabel: 'DISQUALIFIED',
            disqualificationReason: 'Manual Admin Disqualification from Live Proctoring'
          };
        }
        return c;
      }));

      setSelectedParticipant(prev => {
        if (!prev) return null;
        const selUId = String(prev.userId?._id || prev.userId || prev._id || prev.id || '');
        if (selUId === uId) {
          return {
            ...prev,
            isDisqualified: true,
            severityLabel: 'DISQUALIFIED',
            disqualificationReason: 'Manual Admin Disqualification from Live Proctoring'
          };
        }
        return prev;
      });

      fetchProctoringData();
    } catch (err) {
      console.error('Error disqualifying participant:', err);
      alert('Failed to disqualify participant: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleQualify = async (candidate) => {
    const uId = String(candidate.userId?._id || candidate.userId || candidate._id || candidate.id || '');
    const rawCId = candidate.contestId?._id || candidate.contestId || (selectedContestId !== 'all' ? selectedContestId : '');
    const cId = rawCId ? String(rawCId) : '';

    if (!uId) {
      alert('Unable to identify participant ID.');
      return;
    }
    if (!window.confirm(`Are you sure you want to qualify & reinstate ${candidate.name || 'this participant'}?`)) return;

    try {
      emitQualify({
        contestId: cId || undefined,
        userId: uId,
        note: 'Reinstated & Qualified by Administrator'
      });

      if (cId) {
        await api.post(`/contests/${cId}/qualify`, {
          userId: uId,
          note: 'Reinstated & Qualified by Administrator'
        }).catch(() => {});
      }

      // Optimistic UI updates
      setLiveCandidates(prev => prev.map(c => {
        const thisUId = String(c.userId?._id || c.userId || c._id || c.id || '');
        if (thisUId === uId) {
          return {
            ...c,
            isDisqualified: false,
            severityLabel: (c.tabBlurCount || 0) > 0 ? 'WARNING' : 'NORMAL',
            disqualificationReason: ''
          };
        }
        return c;
      }));

      setSelectedParticipant(prev => {
        if (!prev) return null;
        const selUId = String(prev.userId?._id || prev.userId || prev._id || prev.id || '');
        if (selUId === uId) {
          return {
            ...prev,
            isDisqualified: false,
            severityLabel: (prev.tabBlurCount || 0) > 0 ? 'WARNING' : 'NORMAL',
            disqualificationReason: ''
          };
        }
        return prev;
      });

      fetchProctoringData();
    } catch (err) {
      console.error('Error qualifying participant:', err);
      alert('Failed to qualify participant: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleClearAllProctoringData = async () => {
    const isGlobal = selectedContestId === 'all';
    const confirmMessage = isGlobal
      ? 'Are you sure you want to permanently clear ALL live proctoring violations, tab blur logs, and candidate session records across all contests? This cannot be undone.'
      : `Are you sure you want to clear all proctoring logs and candidate integrity records for "${currentContestTitle}"?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setClearingData(true);
      const res = await api.delete(`/contests/proctoring/clear-all?contestId=${selectedContestId}`);
      setLiveCandidates([]);
      alert(res.data?.message || 'Proctoring data cleared successfully.');
      await fetchProctoringData();
    } catch (err) {
      console.error('Error clearing proctoring data:', err);
      alert(err.response?.data?.message || 'Failed to clear proctoring data');
    } finally {
      setClearingData(false);
    }
  };

  const proctoringCandidates = liveCandidates;

  const normalCount = proctoringCandidates.filter(s => (!s.tabBlurCount || s.tabBlurCount === 0) && !s.isDisqualified).length;
  const warningCount = proctoringCandidates.filter(s => s.tabBlurCount > 0 && s.tabBlurCount < (s.maxAllowedBlurs || 3) && !s.isDisqualified).length;
  const disqualifiedCount = proctoringCandidates.filter(s => s.isDisqualified || (s.tabBlurCount || 0) >= (s.maxAllowedBlurs || 3)).length;

  const currentContestTitle = selectedContestId === 'all'
    ? 'All Contests Proctoring Summary'
    : (activeContest ? activeContest.title : 'Contest Proctoring');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Section Header & Contest Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
              Live Contest Security & Proctoring Hub
            </h2>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '0.15rem 0.5rem',
              borderRadius: '12px',
              background: '#DCFCE7',
              color: '#166534',
              border: '1px solid #86EFAC'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }}></span>
              LIVE AUTO-SYNC
            </span>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Real-time tracking of candidate focus, window switches, tab blurs, and disqualifications. (Last checked: {lastRefreshed.toLocaleTimeString()})
          </span>
        </div>

        {/* Action Controls: Contest Dropdown, Export PDF/Excel, & Clear Data */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-paper)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.35rem 0.75rem' }}>
            <Filter size={14} color="var(--text-secondary)" />
            <select
              value={selectedContestId}
              onChange={e => setSelectedContestId(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-ink)',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">🌐 All Contests (Global View)</option>
              {contests.map(c => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  🏆 {c.title} ({c.status || 'Scheduled'})
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => exportProctoringToExcel(proctoringCandidates, currentContestTitle)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Download size={14} /> Download Excel
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => exportProctoringToPDF(proctoringCandidates, currentContestTitle)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Download size={14} /> Download PDF
          </button>

          <button
            className="btn btn-danger btn-sm"
            onClick={handleClearAllProctoringData}
            disabled={clearingData}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              color: '#DC2626',
              cursor: clearingData ? 'not-allowed' : 'pointer',
              fontWeight: 700
            }}
          >
            <Trash2 size={14} /> {clearingData ? 'Clearing...' : 'Clear Proctoring Data'}
          </button>
        </div>
      </div>

      {/* Severity Indicator KPI Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #22C55E' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803D', display: 'block' }}>NORMAL STATUS</span>
          <strong style={{ fontSize: '1.5rem', color: 'var(--text-ink)' }}>{normalCount} Candidates</strong>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #F59E0B' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#D97706', display: 'block' }}>WARNING (TAB SWITCHED)</span>
          <strong style={{ fontSize: '1.5rem', color: '#D97706' }}>{warningCount} Candidates</strong>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #DC2626' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#DC2626', display: 'block' }}>DISQUALIFIED</span>
          <strong style={{ fontSize: '1.5rem', color: '#DC2626' }}>{disqualifiedCount} Candidates</strong>
        </div>
      </div>

      {/* Live Proctoring Monitor Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Candidate Integrity Monitor — {currentContestTitle}
            </h3>
          </div>
          {liveContest && (
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#FEE2E2', color: '#DC2626', fontWeight: 800 }}>
              ● MONITORING LIVE: {liveContest.title}
            </span>
          )}
        </div>

        <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', minWidth: '780px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-paper)' }}>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Team / Group Name</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Participant Name</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Email</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Contest</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Blur Count / Max</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Severity Level</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {proctoringCandidates.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No active candidate proctoring records for this selection.
                  </td>
                </tr>
              ) : (
                proctoringCandidates.map((s, idx) => {
                  const blurs = s.tabBlurCount || 0;
                  const maxBlurs = s.maxAllowedBlurs || 3;
                  const isDisq = s.isDisqualified || blurs >= maxBlurs;
                  let severityLabel = 'NORMAL';
                  let severityBg = '#DCFCE7';
                  let severityColor = '#15803D';

                  if (isDisq) {
                    severityLabel = 'DISQUALIFIED';
                    severityBg = '#FEE2E2';
                    severityColor = '#DC2626';
                  } else if (blurs > 0) {
                    severityLabel = 'WARNING';
                    severityBg = '#FEF3C7';
                    severityColor = '#D97706';
                  }

                  return (
                    <tr key={s._id || s.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, maxWidth: '160px', wordBreak: 'break-word' }}>{s.teamName || s.name || s.userName || 'Team'}</td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, maxWidth: '150px', wordBreak: 'break-word' }}>{s.name || s.userName || 'Candidate'}</td>
                      <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.email}>{s.email || 'N/A'}</td>
                      <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.82rem', color: 'var(--accent-blue)', fontWeight: 600, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.contestTitle}>
                        {s.contestTitle}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: blurs > 0 ? '#DC2626' : 'var(--text-ink)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {blurs} / {maxBlurs}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: severityBg,
                          color: severityColor,
                          display: 'inline-block'
                        }}>
                          {severityLabel}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'center' }}>
                          {/* 1. View Logs & Audit Timeline */}
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedParticipant(s)}
                            title="View Incident Timeline & Integrity Logs"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontWeight: 600,
                              borderRadius: '6px'
                            }}
                          >
                            <Eye size={13} color="var(--accent-blue)" /> View Logs
                          </button>

                          {/* 2. Disqualify or Reinstate Action */}
                          {isDisq ? (
                            <button
                              className="btn btn-sm"
                              onClick={() => handleQualify(s)}
                              title="Reinstate Student & Restore Qualification"
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: '#DCFCE7',
                                color: '#15803D',
                                border: '1px solid #86EFAC',
                                fontWeight: 700,
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              <CheckCircle size={13} color="#15803D" /> Reinstate
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm"
                              onClick={() => handleDisqualify(s)}
                              title="Disqualify Student from Contest"
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: '#FEE2E2',
                                color: '#DC2626',
                                border: '1px solid #FCA5A5',
                                fontWeight: 700,
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              <XCircle size={13} color="#DC2626" /> Disqualify
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ParticipantDetailsModal
        isOpen={!!selectedParticipant}
        onClose={() => setSelectedParticipant(null)}
        participant={selectedParticipant}
        proctorLogs={selectedParticipant?.antiCheatLogs || []}
        onDisqualify={handleDisqualify}
        onQualify={handleQualify}
      />
    </div>
  );
};
