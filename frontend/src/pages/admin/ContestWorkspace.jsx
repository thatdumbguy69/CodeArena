import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  Trophy,
  Users,
  Radio,
  Plus,
  Edit,
  Trash2,
  Play,
  ShieldAlert,
  BarChart2,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Code,
  Eye,
  UserCheck,
  UserX
} from 'lucide-react';
import api from '../../services/api';
import { exportToExcel, exportToPDF, exportProctoringToExcel, exportProctoringToPDF } from '../../utils/exportUtils';
import { ConfirmActionModal } from '../../components/admin/modals/ConfirmActionModal';
import { SubmissionInspectorModal } from '../../components/admin/modals/SubmissionInspectorModal';
import { ParticipantDetailsModal } from '../../components/admin/modals/ParticipantDetailsModal';
import ContestLeaderboard from '../../components/common/ContestLeaderboard';
import { useSocket } from '../../context/SocketContext';

export const ContestWorkspace = ({ contestId, onBack, setEditingContest, setEditingProblem, setCurrentTab, currentUser }) => {
  const { socket, isConnected, joinAdminProctoring, emitDisqualify, emitQualify, emitTimerSync, emitEndContest } = useSocket();

  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview | problems | participants | live-control | proctoring | submissions | leaderboard | reports
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Dynamic Data Lists
  const [participants, setParticipants] = useState([]);
  const [proctoringData, setProctoringData] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  
  // Filtering & Search states
  const [submissionsFilter, setSubmissionsFilter] = useState('All');
  const [submissionsSearch, setSubmissionsSearch] = useState('');
  const [participantsSearch, setParticipantsSearch] = useState('');
  const [proctoringSearch, setProctoringSearch] = useState('');

  // Live Timing Sync State
  const [remainingSecs, setRemainingSecs] = useState(0);
  const [auditLogs, setAuditLogs] = useState([
    { timestamp: new Date().toLocaleTimeString(), message: 'Contest workspace initialized.' }
  ]);

  // Sub-modal triggers
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  useEffect(() => {
    fetchContestData();
    const interval = setInterval(fetchContestData, 15000);
    return () => clearInterval(interval);
  }, [contestId]);

  // Join admin proctoring websocket room & wire real-time integrity listeners
  useEffect(() => {
    if (joinAdminProctoring) {
      joinAdminProctoring();
    }
    if (!socket) return;

    const handleViolation = (data) => {
      const cId = contest?._id || contestId;
      if (String(data.contestId) === String(cId) || (contest?.title && data.contestTitle === contest.title)) {
        setProctoringData(prev => {
          const idx = prev.findIndex(p => String(p.userId || p._id || p.id) === String(data.userId));
          if (idx >= 0) {
            const updated = [...prev];
            const candidate = { ...updated[idx] };
            candidate.tabBlurCount = data.blurCount;
            candidate.blurCount = data.blurCount;
            if (data.isDisqualified !== undefined) candidate.isDisqualified = data.isDisqualified;
            if (data.disqualificationReason) candidate.disqualificationReason = data.disqualificationReason;
            candidate.severityLabel = data.isDisqualified ? 'DISQUALIFIED' : (data.blurCount > 0 ? 'WARNING' : 'NORMAL');
            candidate.antiCheatLogs = [
              ...(candidate.antiCheatLogs || []),
              { event: data.event || `Violation #${data.blurCount}`, timestamp: data.timestamp || new Date() }
            ];
            updated[idx] = candidate;
            return updated;
          }
          return prev;
        });

        setParticipants(prev => {
          return prev.map(p => {
            if (String(p.userId || p._id || p.id) === String(data.userId)) {
              return {
                ...p,
                tabBlurCount: data.blurCount,
                blurCount: data.blurCount,
                isDisqualified: data.isDisqualified !== undefined ? data.isDisqualified : p.isDisqualified,
                disqualificationReason: data.disqualificationReason || p.disqualificationReason
              };
            }
            return p;
          });
        });
      }
    };

    const handleStudentJoined = (data) => {
      const cId = contest?._id || contestId;
      if (String(data.contestId) === String(cId) || (contest?.title && data.contestTitle === contest.title)) {
        fetchContestData();
      }
    };

    const handleDisq = (data) => {
      const cId = contest?._id || contestId;
      if (String(data.contestId) === String(cId) || (contest?.title && data.contestTitle === contest.title)) {
        setProctoringData(prev => prev.map(p => {
          if (String(p.userId || p._id || p.id) === String(data.userId)) {
            return { ...p, isDisqualified: true, severityLabel: 'DISQUALIFIED', disqualificationReason: data.reason || 'Disqualified' };
          }
          return p;
        }));
        setParticipants(prev => prev.map(p => {
          if (String(p.userId || p._id || p.id) === String(data.userId)) {
            return { ...p, isDisqualified: true, disqualificationReason: data.reason || 'Disqualified' };
          }
          return p;
        }));
      }
    };

    const handleQual = (data) => {
      const cId = contest?._id || contestId;
      if (String(data.contestId) === String(cId) || (contest?.title && data.contestTitle === contest.title)) {
        setProctoringData(prev => prev.map(p => {
          if (String(p.userId || p._id || p.id) === String(data.userId)) {
            return { ...p, isDisqualified: false, tabBlurCount: 0, blurCount: 0, severityLabel: 'NORMAL', disqualificationReason: '' };
          }
          return p;
        }));
        setParticipants(prev => prev.map(p => {
          if (String(p.userId || p._id || p.id) === String(data.userId)) {
            return { ...p, isDisqualified: false, tabBlurCount: 0, blurCount: 0, disqualificationReason: '' };
          }
          return p;
        }));
      }
    };

    socket.on('proctoring:violation', handleViolation);
    socket.on('proctoring:student_joined', handleStudentJoined);
    socket.on('proctoring:student_disqualified', handleDisq);
    socket.on('proctoring:student_qualified', handleQual);

    return () => {
      socket.off('proctoring:violation', handleViolation);
      socket.off('proctoring:student_joined', handleStudentJoined);
      socket.off('proctoring:student_disqualified', handleDisq);
      socket.off('proctoring:student_qualified', handleQual);
    };
  }, [socket, contest?._id, contestId]);

  // Continuous 1-Second Timer Tick for Admin Contest Workspace
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSecs(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard' && contestId) {
      fetchLeaderboard();
    }
  }, [activeTab, contestId]);

  const fetchLeaderboard = async () => {
    if (!contestId) return;
    try {
      setLeaderboardLoading(true);
      const res = await api.get(`/leaderboard/rankings?contestId=${contestId}`);
      setLeaderboardData(res.data.leaderboard || []);
    } catch (err) {
      console.error('Error fetching leaderboard rankings:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const fetchContestData = async () => {
    if (!contestId) return;
    try {
      // 1. Fetch contest detail
      const res = await api.get(`/contests/${contestId}`);
      const data = res.data.contest || res.data;
      setContest(data);
      if (data.remainingSecs !== undefined) {
        setRemainingSecs(data.remainingSecs);
      }
      if (data.participants && Array.isArray(data.participants)) {
        setParticipants(data.participants);
      }

      const cId = data?._id || contestId;

      // 2. Concurrently fetch Submissions, Proctoring summary, and Contest Analytics
      const [subRes, procRes, analyticsRes] = await Promise.allSettled([
        api.get(`/submissions?contestId=${cId}`),
        api.get('/contests/proctoring/summary'),
        api.get(`/contests/${cId}/analytics`)
      ]);

      // Submissions sync
      if (subRes.status === 'fulfilled' && subRes.value.data?.submissions) {
        setSubmissions(subRes.value.data.submissions);
      } else if (analyticsRes.status === 'fulfilled' && analyticsRes.value.data?.recentSubmissions) {
        setSubmissions(analyticsRes.value.data.recentSubmissions);
      }

      // Proctoring sync
      if (procRes.status === 'fulfilled' && procRes.value.data?.candidates) {
        const contestCandidates = procRes.value.data.candidates.filter(
          c => String(c.contestId) === String(cId) || (data?.title && c.contestTitle === data.title)
        );
        setProctoringData(contestCandidates);

        // Fallback for participants if not already populated
        if (!data.participants || data.participants.length === 0) {
          if (analyticsRes.status === 'fulfilled' && analyticsRes.value.data?.participants) {
            setParticipants(analyticsRes.value.data.participants);
          } else if (contestCandidates.length > 0) {
            setParticipants(contestCandidates);
          }
        }
      } else if (analyticsRes.status === 'fulfilled' && analyticsRes.value.data?.participants) {
        setParticipants(analyticsRes.value.data.participants);
        setProctoringData(analyticsRes.value.data.participants);
      }
    } catch (err) {
      console.error('Error fetching contest details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartContestNow = async () => {
    if (!contest) return;
    try {
      const res = await api.put(`/contests/${contest._id || contest.id}`, { action: 'start_now', duration: contest.duration || 60 });
      setAuditLogs(prev => [
        { timestamp: new Date().toLocaleTimeString(), message: 'Contest started LIVE immediately by administrator.' },
        ...prev
      ]);
      fetchContestData();
    } catch (err) {
      alert('Error starting contest');
    }
  };

  const handleAdjustTime = async (minutes) => {
    if (!contest) return;
    const actionLabel = minutes > 0 ? `Extend by ${minutes} mins` : `Reduce by ${Math.abs(minutes)} mins`;
    try {
      const newRemSecs = Math.max(0, remainingSecs + (minutes * 60));
      setRemainingSecs(newRemSecs);

      await api.put(`/contests/${contest._id || contest.id}`, { timeAdjustmentMins: minutes });
      setAuditLogs(prev => [
        { timestamp: new Date().toLocaleTimeString(), message: `Admin adjusted duration: ${actionLabel}` },
        ...prev
      ]);
      fetchContestData();
    } catch (err) {
      alert('Error updating duration');
    }
  };

  const handleEndContest = async () => {
    try {
      setRemainingSecs(0);

      // Broadcast immediate force submit / end contest to all active participants
      if (emitEndContest) {
        emitEndContest({
          contestId: contest._id || contest.id || contestId
        });
      }

      await api.put(`/contests/${contest._id || contest.id}`, { status: 'Ended', remainingSecs: 0 });
      setAuditLogs(prev => [
        { timestamp: new Date().toLocaleTimeString(), message: 'Contest terminated by host admin.' },
        ...prev
      ]);
      fetchContestData();
    } catch (err) {
      alert('Error ending contest');
    }
  };

  const handleDisqualify = async (userId, reason) => {
    try {
      const payloadReason = reason || 'Manual Admin Disqualification from Contest Workspace';
      await api.post(`/contests/${contest._id || contest.id || contestId}/disqualify`, { userId, reason: payloadReason });
      
      if (emitDisqualify) {
        emitDisqualify({
          contestId: contest?._id || contestId,
          userId,
          reason: payloadReason
        });
      }

      setParticipants(prev => prev.map(p => {
        if (String(p._id || p.userId || p.id) === String(userId)) {
          return { ...p, isDisqualified: true, disqualificationReason: payloadReason, status: 'Disqualified' };
        }
        return p;
      }));

      setProctoringData(prev => prev.map(c => {
        if (String(c._id || c.userId || c.id) === String(userId)) {
          return { ...c, isDisqualified: true, disqualificationReason: payloadReason, severityLabel: 'DISQUALIFIED' };
        }
        return c;
      }));

      setAuditLogs(prev => [
        { timestamp: new Date().toLocaleTimeString(), message: `Participant ID ${userId} disqualified by admin.` },
        ...prev
      ]);
      fetchContestData();
    } catch (err) {
      console.error('Error disqualifying participant:', err);
      alert(err.response?.data?.message || 'Error disqualifying participant');
    }
  };

  const handleQualify = async (userId, note) => {
    try {
      await api.post(`/contests/${contest._id || contest.id || contestId}/qualify`, { userId, note: note || 'Reinstated by Admin' });

      if (emitQualify) {
        emitQualify({
          contestId: contest?._id || contestId,
          userId
        });
      }

      setParticipants(prev => prev.map(p => {
        if (String(p._id || p.userId || p.id) === String(userId)) {
          return { ...p, isDisqualified: false, disqualificationReason: '', tabBlurCount: 0, blurCount: 0, status: 'Active' };
        }
        return p;
      }));

      setProctoringData(prev => prev.map(c => {
        if (String(c._id || c.userId || c.id) === String(userId)) {
          return { ...c, isDisqualified: false, disqualificationReason: '', tabBlurCount: 0, blurCount: 0, severityLabel: 'NORMAL' };
        }
        return c;
      }));

      setAuditLogs(prev => [
        { timestamp: new Date().toLocaleTimeString(), message: `Participant ID ${userId} reinstated / qualified by admin.` },
        ...prev
      ]);
      fetchContestData();
    } catch (err) {
      console.error('Error reinstating participant:', err);
      alert(err.response?.data?.message || 'Error reinstating participant');
    }
  };

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Contest Workspace...</div>;
  }

  if (!contest) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <h3>Contest Not Found</h3>
        <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Back to Contests
        </button>
      </div>
    );
  }

  const formatSecs = (secs) => {
    if (secs <= 0) return '00:00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const statusBadgeColor = contest.status === 'Live' ? '#DC2626' : (contest.status === 'Upcoming' ? '#D97706' : '#4F46E5');

  const filteredParticipants = (participants || []).filter(p => {
    if (!participantsSearch.trim()) return true;
    const q = participantsSearch.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.userName && p.userName.toLowerCase().includes(q)) ||
      (p.teamName && p.teamName.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  });

  const filteredProctoring = (proctoringData || []).filter(p => {
    if (!proctoringSearch.trim()) return true;
    const q = proctoringSearch.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.userName && p.userName.toLowerCase().includes(q)) ||
      (p.teamName && p.teamName.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  });

  // Deduplicate submissions by unique ID
  const seenSubIds = new Set();
  const deduplicatedContestSubmissions = (submissions || []).filter(sub => {
    const id = String(sub._id || sub.id || '');
    if (!id || seenSubIds.has(id)) return false;
    seenSubIds.add(id);
    return true;
  });

  const filteredSubmissions = deduplicatedContestSubmissions.filter(s => {
    if (submissionsFilter !== 'All') {
      if (s.verdict !== submissionsFilter) return false;
    }
    if (!submissionsSearch.trim()) return true;
    const q = submissionsSearch.toLowerCase();
    return (
      (s.userName && s.userName.toLowerCase().includes(q)) ||
      (s.user?.name && s.user.name.toLowerCase().includes(q)) ||
      (s.user?.email && s.user.email.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.questionTitle && s.questionTitle.toLowerCase().includes(q)) ||
      (s.question?.title && s.question.title.toLowerCase().includes(q)) ||
      (s.language && s.language.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Back button & Title Bar */}
      <div>
        <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Contests Management
        </button>

        {/* Workspace Hero Header */}
        <div className="glass-card" style={{
          padding: '1.5rem 2rem',
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <span style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 800,
                background: contest.status === 'Live' ? '#FEE2E2' : '#E0E7FF',
                color: statusBadgeColor
              }}>
                {contest.status === 'Live' ? '● LIVE NOW' : (contest.status || 'UPCOMING')}
              </span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
                {contest.title}
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
              {contest.description || 'Competitive Programming Host Session Workspace'}
            </p>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>REMAINING TIME</span>
              <strong style={{ fontSize: '1.4rem', fontFamily: 'IBM Plex Mono, monospace', color: contest.status === 'Live' ? '#DC2626' : 'var(--text-ink)' }}>
                {formatSecs(remainingSecs)}
              </strong>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                if (setEditingContest) setEditingContest(contest);
                if (setCurrentTab) setCurrentTab('host-contest');
              }}
            >
              <Edit size={16} /> Edit Contest
            </button>
          </div>
        </div>
      </div>

      {/* 7 Primary Tabs Navigation Bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        background: '#FFFFFF',
        borderRadius: '8px',
        padding: '0 0.5rem',
        overflowX: 'auto'
      }}>
        {[
          { id: 'overview', label: 'Overview', icon: FileText },
          { id: 'problems', label: `Problems (${(contest.problemsDetails || contest.problems || []).length})`, icon: Trophy },
          { id: 'live-control', label: 'Live Control', icon: Radio, badge: contest.status === 'Live' ? 'REC' : null },
          { id: 'proctoring', label: `Proctoring (${proctoringData.length})`, icon: ShieldAlert },
          { id: 'submissions', label: `Submissions (${submissions.length})`, icon: FileText },
          { id: 'leaderboard', label: 'Leaderboard', icon: BarChart2 },
          { id: 'reports', label: 'Reports', icon: Download }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.85rem 1.1rem',
                border: 'none',
                background: 'transparent',
                borderBottom: active ? '2px solid var(--accent-blue)' : '2px solid transparent',
                color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
                fontWeight: active ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} />
              {tab.label}
              {tab.badge && (
                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: '#FEE2E2', color: '#DC2626', fontWeight: 800 }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Contest Metadata</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div><strong>Start Time:</strong> {new Date(contest.startTime || Date.now()).toLocaleString()}</div>
              <div><strong>Scheduled End:</strong> {new Date(contest.endTime || Date.now() + 7200000).toLocaleString()}</div>
              <div><strong>Duration:</strong> {contest.durationMinutes || contest.duration || 60} Minutes</div>
              <div><strong>Allowed Languages:</strong> {contest.allowedLanguages ? contest.allowedLanguages.join(', ') : 'All Supported'}</div>
              <div><strong>Max Tab Blurs Allowed:</strong> {contest.maxAllowedBlurs || 3}</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Assigned Problems ({contest.problems?.length || 0})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(contest.problemsDetails || contest.problems || []).map((prob, idx) => (
                <div key={idx} style={{ padding: '0.6rem 0.8rem', background: 'var(--bg-paper)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Q{idx + 1}. {prob.title || `Problem ${prob}`} ({prob.difficulty || 'Medium'} — {prob.points || 100} pts)
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: PROBLEMS */}
      {activeTab === 'problems' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Assigned Problem Statements</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setEditingProblem(null)}>
              <Plus size={16} /> Add / Create Question
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-paper)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>#</th>
                <th style={{ padding: '0.75rem 1rem' }}>Problem Title</th>
                <th style={{ padding: '0.75rem 1rem' }}>Difficulty</th>
                <th style={{ padding: '0.75rem 1rem' }}>Points</th>
                <th style={{ padding: '0.75rem 1rem' }}>Time / Memory Limit</th>
              </tr>
            </thead>
            <tbody>
              {(contest.problemsDetails || contest.problems || []).map((p, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Q{idx + 1}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{p.title || p}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{p.difficulty || 'Medium'}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{p.points || 100} pts</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{p.timeLimit || 2000}ms / {p.memoryLimit || 256}MB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: LIVE CONTROL CENTER */}
      {activeTab === 'live-control' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', background: 'linear-gradient(180deg, #FFFFFF 0%, var(--bg-paper) 100%)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>LIVE COUNTDOWN TIMER</h3>
            <div style={{ fontSize: '3.5rem', fontWeight: 900, fontFamily: 'IBM Plex Mono, monospace', color: '#DC2626', letterSpacing: '2px', margin: '0.5rem 0' }}>
              {formatSecs(remainingSecs)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              {(contest.status !== 'Live' || remainingSecs <= 0) && (
                <button
                  className="btn btn-primary"
                  onClick={handleStartContestNow}
                  style={{ background: '#16A34A', borderColor: '#16A34A' }}
                >
                  <Play size={16} /> Start Contest Live Now
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => handleAdjustTime(15)}>
                +15 Minutes
              </button>
              <button className="btn btn-secondary" onClick={() => handleAdjustTime(30)}>
                +30 Minutes
              </button>
              <button className="btn btn-secondary" onClick={() => handleAdjustTime(-10)}>
                -10 Minutes
              </button>
              <button
                className="btn btn-sm"
                onClick={() => setConfirmModal({
                  isOpen: true,
                  title: 'End Contest Immediately',
                  message: 'Ending the contest will immediately stop all participant activity and finalize active code submissions. This action cannot be undone.',
                  confirmText: 'End Contest Now',
                  onConfirm: handleEndContest
                })}
                style={{ background: '#DC2626', color: '#FFF', fontWeight: 700, border: 'none' }}
              >
                End Contest Now
              </button>
            </div>
          </div>

          {/* Audit Event Log */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.85rem' }}>Host Audit & Timing Synchronization Log</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.82rem' }}>
              {auditLogs.map((log, i) => (
                <div key={i} style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-paper)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>[{log.timestamp}]</span> {log.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: PROCTORING */}
      {activeTab === 'proctoring' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Live Contest Proctoring Monitor</h3>
                <span style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  background: '#DCFCE7',
                  color: '#15803D'
                }}>
                  🟢 REAL-TIME SYNC
                </span>
              </div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Monitors tab switching, window blurs, and candidate integrity violations in real time. (Threshold: {contest.maxAllowedBlurs || 3} blurs)
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Filter candidate..."
                  value={proctoringSearch}
                  onChange={e => setProctoringSearch(e.target.value)}
                  style={{
                    padding: '0.4rem 0.6rem 0.4rem 2rem',
                    fontSize: '0.85rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: '#FFF'
                  }}
                />
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const data = proctoringData.map(p => ({
                    ...p,
                    contestTitle: contest.title,
                    maxAllowedBlurs: contest.maxAllowedBlurs || 3
                  }));
                  exportProctoringToExcel(data, contest.title);
                }}
              >
                <Download size={14} /> Download Excel
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const data = proctoringData.map(p => ({
                    ...p,
                    contestTitle: contest.title,
                    maxAllowedBlurs: contest.maxAllowedBlurs || 3
                  }));
                  exportProctoringToPDF(data, contest.title);
                }}
              >
                <Download size={14} /> Download PDF
              </button>
            </div>
          </div>

          {filteredProctoring.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <ShieldAlert size={36} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
              <h4 style={{ margin: 0, fontWeight: 700 }}>No proctoring records yet</h4>
              <p style={{ fontSize: '0.85rem', margin: '0.4rem 0 0' }}>
                {proctoringSearch
                  ? 'No candidates matched your search criteria.'
                  : 'As candidates enter this contest arena, real-time integrity and blur logs will appear here.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-paper)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Candidate</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Team / Group</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Tab Blurs</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Max Allowed</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Severity</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Latest Violation Event</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProctoring.map((part, i) => {
                    const blurs = part.tabBlurCount || part.blurCount || 0;
                    const maxAllowed = part.maxAllowedBlurs || contest.maxAllowedBlurs || 3;
                    const isDisq = part.isDisqualified || blurs >= maxAllowed;
                    const uId = part.userId || part._id || part.id;
                    const lastEvent = part.antiCheatLogs && part.antiCheatLogs.length > 0
                      ? part.antiCheatLogs[part.antiCheatLogs.length - 1]
                      : null;

                    return (
                      <tr key={uId || i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: isDisq ? '#FEE2E2' : '#EFF6FF',
                              color: isDisq ? '#DC2626' : 'var(--accent-blue)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}>
                              {(part.name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <span>{part.name || part.userName || 'Candidate'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                          {part.teamName || '—'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                          {part.email || 'N/A'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: blurs > 0 ? '#DC2626' : 'var(--text-ink)' }}>
                          {blurs} / {maxAllowed}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>{maxAllowed}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: isDisq ? '#FEE2E2' : (blurs > 0 ? '#FEF3C7' : '#DCFCE7'),
                            color: isDisq ? '#DC2626' : (blurs > 0 ? '#D97706' : '#15803D')
                          }}>
                            {isDisq ? 'DISQUALIFIED' : (blurs > 0 ? `WARNING (${blurs}/${maxAllowed})` : 'NORMAL')}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {lastEvent ? (
                            <span title={`${lastEvent.event} at ${new Date(lastEvent.timestamp).toLocaleTimeString()}`}>
                              ⚠️ {lastEvent.event}
                            </span>
                          ) : (
                            <span style={{ color: '#15803D' }}>🟢 Normal focus maintained</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedParticipant(part)}
                              title="View Proctoring Incident Timeline"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                            >
                              <Eye size={13} /> View Logs
                            </button>
                            {isDisq ? (
                              <button
                                className="btn btn-sm"
                                onClick={() => handleQualify(uId)}
                                title="Reinstate Candidate"
                                style={{
                                  background: '#DCFCE7',
                                  color: '#15803D',
                                  border: '1px solid #86EFAC',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  padding: '0.3rem 0.6rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}
                              >
                                <UserCheck size={13} /> Reinstate
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm"
                                onClick={() => handleDisqualify(uId)}
                                title="Disqualify Candidate"
                                style={{
                                  background: '#FEE2E2',
                                  color: '#DC2626',
                                  border: '1px solid #FCA5A5',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  padding: '0.3rem 0.6rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}
                              >
                                <UserX size={13} /> Disqualify
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: SUBMISSIONS */}
      {activeTab === 'submissions' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Contest Code Submissions ({filteredSubmissions.length})
              </h3>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Review all solutions submitted during this contest session in real time.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Search student or problem..."
                  value={submissionsSearch}
                  onChange={e => setSubmissionsSearch(e.target.value)}
                  style={{
                    padding: '0.4rem 0.6rem 0.4rem 2rem',
                    fontSize: '0.85rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: '#FFF'
                  }}
                />
              </div>

              <button className="btn btn-secondary btn-sm" onClick={fetchContestData}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          {/* Verdict Filter Chips */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {['All', 'Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Compile Error'].map(status => {
              const active = submissionsFilter === status;
              const count = status === 'All'
                ? submissions.length
                : submissions.filter(s => s.verdict === status).length;
              return (
                <button
                  key={status}
                  onClick={() => setSubmissionsFilter(status)}
                  style={{
                    padding: '0.3rem 0.7rem',
                    borderRadius: '20px',
                    border: active ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                    background: active ? 'var(--accent-blue)' : '#FFFFFF',
                    color: active ? '#FFFFFF' : 'var(--text-secondary)',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {status} ({count})
                </button>
              );
            })}
          </div>

          {filteredSubmissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <FileText size={36} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
              <h4 style={{ margin: 0, fontWeight: 700 }}>No submissions found</h4>
              <p style={{ fontSize: '0.85rem', margin: '0.4rem 0 0' }}>
                {submissionsSearch || submissionsFilter !== 'All'
                  ? 'No submissions matched your filter criteria.'
                  : 'Candidate code submissions filed during this contest will appear here in real time.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-paper)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>#</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Candidate</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Problem</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Language</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Verdict</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Score</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Test Cases</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Time / Memory</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Integrity</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Submitted At</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((sub, idx) => {
                    const isAccepted = sub.verdict === 'Accepted' || sub.status === 'Accepted' || sub.status === 'Passed';
                    const isTLE = sub.verdict === 'Time Limit Exceeded';
                    const verdictBg = isAccepted ? '#DCFCE7' : (isTLE ? '#FEF3C7' : '#FEE2E2');
                    const verdictColor = isAccepted ? '#15803D' : (isTLE ? '#D97706' : '#DC2626');

                    return (
                      <tr key={sub._id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          #{String(sub._id || '').substring(0, 7)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                          <div>{sub.userName || sub.user?.name || 'Student'}</div>
                          {(sub.user?.email || sub.email) && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                              {sub.user?.email || sub.email}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                          {sub.questionTitle || sub.question?.title || 'Problem'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            background: '#F1F5F9',
                            color: '#475569',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            fontFamily: 'IBM Plex Mono, monospace'
                          }}>
                            {sub.language}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: verdictBg,
                            color: verdictColor,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            {isAccepted ? <CheckCircle size={12} /> : (isTLE ? <Clock size={12} /> : <XCircle size={12} />)}
                            {sub.verdict || 'Evaluated'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                          {sub.score || 0} pts
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem' }}>
                          {sub.testCasesPassed !== undefined ? `${sub.testCasesPassed} / ${sub.totalTestCases || 0}` : '—'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {sub.executionTime ? `${sub.executionTime}s` : '0s'} {sub.memoryUsed ? `/ ${sub.memoryUsed}KB` : ''}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: (sub.blurCount || 0) > 0 ? '#FEE2E2' : '#F1F5F9',
                            color: (sub.blurCount || 0) > 0 ? '#DC2626' : '#64748B'
                          }}>
                            {sub.blurCount || 0} blurs
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {sub.createdAt ? new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedSubmission(sub)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.78rem',
                              padding: '0.3rem 0.65rem'
                            }}
                          >
                            <Code size={13} /> Inspect Code
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 7: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => exportToExcel(leaderboardData, contest?.title || 'Contest Leaderboard')}>
              <Download size={14} /> Export CSV
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => exportToPDF(leaderboardData, contest?.title || 'Contest Leaderboard')}>
              <Download size={14} /> Export PDF
            </button>
            <button className="btn btn-secondary btn-sm" onClick={fetchLeaderboard}>
              <RefreshCw size={14} /> Refresh Ranks
            </button>
          </div>

          <ContestLeaderboard
            data={leaderboardData}
            title={contest?.title ? `${contest.title} Leaderboard` : "Contest Leaderboard"}
            subtitle="Live session standings & per-problem speed analysis"
            isLive={contest?.status === 'Live' || contest?.status === 'Active'}
            loading={leaderboardLoading}
            currentUserId={currentUser?.id || currentUser?._id}
            currentUserEmail={currentUser?.email}
            emptyMessage="No participant rankings recorded for this contest session yet."
          />
        </div>
      )}

      {/* Tab 8: REPORTS */}
      {activeTab === 'reports' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Post-Contest Performance Summary</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Analytical breakdown of score distributions and problem solve rates.</p>
        </div>
      )}

      {/* Sub-Modals */}
      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false })}
        onConfirm={confirmModal.onConfirm || (() => {})}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
      />

      <SubmissionInspectorModal
        isOpen={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        submission={selectedSubmission}
      />

      <ParticipantDetailsModal
        isOpen={!!selectedParticipant}
        onClose={() => setSelectedParticipant(null)}
        participant={selectedParticipant}
        proctorLogs={selectedParticipant?.antiCheatLogs || []}
        onDisqualify={(reason) => handleDisqualify(selectedParticipant?._id || selectedParticipant?.userId, reason)}
        onQualify={(note) => handleQualify(selectedParticipant?._id || selectedParticipant?.userId, note)}
      />
    </div>
  );
};
