import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  ArrowLeft,
  Send,
  Clock,
  Calendar,
  ShieldCheck,
  Award,
  CheckCircle2,
  FileCode,
  AlertTriangle,
  Zap,
  Sparkles
} from 'lucide-react';

export const HostContestPage = ({ contestToEdit, setCurrentTab }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedProblemIds, setSelectedProblemIds] = useState([]);
  const [antiCheatEnabled, setAntiCheatEnabled] = useState(true);
  const [maxAllowedBlurs, setMaxAllowedBlurs] = useState(3);
  const [autoDisqualify, setAutoDisqualify] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Helper: Format a Date object to YYYY-MM-DDTHH:mm string for datetime-local input
  const formatDateTimeLocal = (d) => {
    if (!d || isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    fetchQuestions();

    if (contestToEdit) {
      setTitle(contestToEdit.title || '');
      setDescription(contestToEdit.description || '');
      const dur = contestToEdit.duration || 60;
      setDuration(dur);

      let sDate = new Date();
      if (contestToEdit.startTime) {
        sDate = new Date(contestToEdit.startTime);
        setStartTime(formatDateTimeLocal(sDate));
      }

      if (contestToEdit.endTime) {
        setEndTime(formatDateTimeLocal(new Date(contestToEdit.endTime)));
      } else {
        setEndTime(formatDateTimeLocal(new Date(sDate.getTime() + dur * 60000)));
      }

      setAntiCheatEnabled(contestToEdit.antiCheatEnabled !== undefined ? contestToEdit.antiCheatEnabled : true);
      setMaxAllowedBlurs(contestToEdit.maxAllowedBlurs !== undefined ? contestToEdit.maxAllowedBlurs : 3);
      setAutoDisqualify(contestToEdit.autoDisqualify !== undefined ? contestToEdit.autoDisqualify : true);

      if (contestToEdit.problems) {
        setSelectedProblemIds(contestToEdit.problems.map(p => p._id || p.slug || p));
      }
    } else {
      // Default: Start now + 15 mins, Duration 60 mins
      const defaultStart = new Date(Date.now() + 15 * 60000);
      const defaultEnd = new Date(defaultStart.getTime() + 60 * 60000);
      setStartTime(formatDateTimeLocal(defaultStart));
      setEndTime(formatDateTimeLocal(defaultEnd));
      setDuration(60);

      // Load defaults from System Settings configured by Admin
      api.get('/settings').then(res => {
        if (res.data && res.data.settings) {
          if (res.data.settings.maxAllowedBlurs !== undefined) {
            setMaxAllowedBlurs(res.data.settings.maxAllowedBlurs);
          }
          if (res.data.settings.autoDisqualify !== undefined) {
            setAutoDisqualify(res.data.settings.autoDisqualify);
          }
          if (res.data.settings.defaultDuration) {
            setDuration(res.data.settings.defaultDuration);
            setEndTime(formatDateTimeLocal(new Date(defaultStart.getTime() + res.data.settings.defaultDuration * 60000)));
          }
        }
      }).catch(() => {});
    }
  }, [contestToEdit]);

  // When Start Time changes: update End Time based on current Duration
  const handleStartTimeChange = (val) => {
    setStartTime(val);
    if (val) {
      const s = new Date(val);
      if (!isNaN(s.getTime())) {
        const e = new Date(s.getTime() + (parseInt(duration, 10) || 60) * 60000);
        setEndTime(formatDateTimeLocal(e));
      }
    }
  };

  // When End Time changes: update Duration based on Start Time
  const handleEndTimeChange = (val) => {
    setEndTime(val);
    if (val && startTime) {
      const s = new Date(startTime);
      const e = new Date(val);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e > s) {
        const diffMins = Math.max(1, Math.round((e.getTime() - s.getTime()) / 60000));
        setDuration(diffMins);
      }
    }
  };

  // When Duration changes: update End Time based on Start Time
  const handleDurationChange = (val) => {
    const num = Math.max(1, parseInt(val, 10) || 1);
    setDuration(num);
    if (startTime) {
      const s = new Date(startTime);
      if (!isNaN(s.getTime())) {
        const e = new Date(s.getTime() + num * 60000);
        setEndTime(formatDateTimeLocal(e));
      }
    }
  };

  // Quick Duration Preset Buttons
  const applyPresetDuration = (mins) => {
    handleDurationChange(mins);
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/questions');
      setQuestions(res.data.questions || []);
    } catch (err) {
      console.error('Failed to fetch questions for contest builder', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContest = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a contest title.');
      return;
    }
    if (selectedProblemIds.length === 0) {
      alert('Please select at least one problem for this contest.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const sDate = startTime ? new Date(startTime) : new Date();
      const durMins = parseInt(duration, 10) || 60;
      const eDate = endTime ? new Date(endTime) : new Date(sDate.getTime() + durMins * 60000);

      if (eDate <= sDate) {
        setError('End time must be strictly after Start time.');
        setSubmitting(false);
        return;
      }

      const payload = {
        title,
        description,
        startTime: sDate.toISOString(),
        endTime: eDate.toISOString(),
        duration: durMins,
        problemIds: selectedProblemIds,
        antiCheatEnabled,
        maxAllowedBlurs: Math.max(1, parseInt(maxAllowedBlurs, 10) || 3),
        autoDisqualify
      };

      if (contestToEdit && contestToEdit._id) {
        await api.put(`/contests/${contestToEdit._id}`, payload);
      } else {
        await api.post('/contests', payload);
      }

      alert('Contest published successfully!');
      setCurrentTab('admin');
    } catch (err) {
      console.error('Error publishing contest:', err);
      setError(err.response?.data?.message || 'Failed to publish contest.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper formatting for live summary
  const getFormattedSummary = () => {
    if (!startTime || !endTime) return null;
    const s = new Date(startTime);
    const e = new Date(endTime);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;

    const now = new Date();
    const isUpcoming = s > now;
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    const durationLabel = `${hours > 0 ? `${hours}h ` : ''}${mins > 0 ? `${mins}m` : (hours === 0 ? '0m' : '')}`;

    return {
      startStr: s.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
      endStr: e.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
      durationLabel,
      isUpcoming
    };
  };

  const summary = getFormattedSummary();

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1000px' }}>
      
      {/* Top Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentTab('admin')} style={{ marginBottom: '0.5rem' }}>
            <ArrowLeft size={14} /> Back to Admin Panel
          </button>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-purple)' }}>
            {contestToEdit ? `Edit Contest: ${contestToEdit.title}` : 'Host New Competitive Assessment / Event'}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btn btn-secondary" onClick={() => setCurrentTab('admin')}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleCreateContest} disabled={submitting}>
            <Send size={16} /> {submitting ? 'Publishing...' : 'Publish Contest Now'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,82,82,0.1)', border: '1px solid #ff5252', color: '#ff5252', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
          <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          {error}
        </div>
      )}

      <form onSubmit={handleCreateContest} className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Contest Metadata */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.95rem' }}>Contest Event Title</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Annual Coding Championship 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.95rem' }}>Event Description &amp; Rules</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Explain guidelines, scoring rules, and instructions for participants..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Contest Scheduling & Timings Card */}
        <div style={{
          background: 'var(--bg-paper)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-ink)' }}>
              <Clock size={18} color="var(--accent-blue)" /> Contest Scheduling &amp; Timings
            </h3>
            {summary && (
              <span style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                background: summary.isUpcoming ? '#FEF3C7' : '#DCFCE7',
                color: summary.isUpcoming ? '#B45309' : '#15803D',
                border: `1px solid ${summary.isUpcoming ? '#FCD34D' : '#86EFAC'}`
              }}>
                {summary.isUpcoming ? '🕒 UPCOMING SCHEDULE' : '⚡ STARTS IMMEDIATELY'}
              </span>
            )}
          </div>

          {/* 3-Column Inputs: Start Time, End Time, Duration */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {/* 1. Start Time */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={15} color="var(--accent-blue)" /> Start Time (Wall Clock)
              </label>
              <input
                type="datetime-local"
                className="form-input"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-slate)', marginTop: '0.35rem', display: 'block' }}>
                When the contest problem statements unlock.
              </span>
            </div>

            {/* 2. End Time */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={15} color="#DC2626" /> End Time (Wall Clock)
              </label>
              <input
                type="datetime-local"
                className="form-input"
                value={endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-slate)', marginTop: '0.35rem', display: 'block' }}>
                When timer ends and all code auto-submits.
              </span>
            </div>

            {/* 3. Duration (Minutes) */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={15} color="#D97706" /> Duration (Minutes)
              </label>
              <input
                type="number"
                className="form-input"
                min="1"
                max="10080"
                placeholder="e.g. 60"
                value={duration}
                onChange={(e) => handleDurationChange(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-slate)', marginTop: '0.35rem', display: 'block' }}>
                Total test duration ({Math.floor(duration / 60)}h {duration % 60}m).
              </span>
            </div>
          </div>

          {/* Quick Duration Presets Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-slate)' }}>Quick Durations:</span>
            {[
              { label: '30 mins', mins: 30 },
              { label: '45 mins', mins: 45 },
              { label: '60 mins (1h)', mins: 60 },
              { label: '90 mins (1.5h)', mins: 90 },
              { label: '120 mins (2h)', mins: 120 },
              { label: '180 mins (3h)', mins: 180 },
              { label: '24 Hours', mins: 1440 }
            ].map(p => (
              <button
                key={p.mins}
                type="button"
                onClick={() => applyPresetDuration(p.mins)}
                style={{
                  background: duration === p.mins ? 'var(--accent-blue)' : '#FFFFFF',
                  color: duration === p.mins ? '#FFFFFF' : 'var(--text-ink)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '20px',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Live Schedule Summary Visualizer */}
          {summary && (
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.85rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              fontSize: '0.84rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: 'var(--text-slate)', fontSize: '0.72rem', display: 'block', fontWeight: 700 }}>STARTS AT</span>
                  <strong style={{ color: 'var(--text-ink)' }}>{summary.startStr}</strong>
                </div>
                <div style={{ color: 'var(--text-slate)', fontWeight: 700 }}>➔</div>
                <div>
                  <span style={{ color: 'var(--text-slate)', fontSize: '0.72rem', display: 'block', fontWeight: 700 }}>ENDS AT</span>
                  <strong style={{ color: 'var(--text-ink)' }}>{summary.endStr}</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--text-slate)', fontSize: '0.72rem', display: 'block', fontWeight: 700 }}>TOTAL TEST WINDOW</span>
                <strong style={{ color: 'var(--accent-blue)', fontSize: '0.95rem' }}>{summary.durationLabel}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Anti-Cheat Proctoring */}
        <div className="form-group" style={{ background: 'var(--bg-paper)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={antiCheatEnabled}
              onChange={(e) => setAntiCheatEnabled(e.target.checked)}
            />
            <ShieldCheck size={18} color="var(--accent-blue)" /> Enable Real-Time Proctoring &amp; Violation Guard
          </label>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-slate)', marginLeft: '1.8rem', marginTop: '-0.3rem' }}>
            Enforces fullscreen mode, detects tab switches / window blur, and flags violations to administrators.
          </span>

          {antiCheatEnabled && (
            <div style={{ marginLeft: '1.8rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-ink)' }}>
                  Maximum Tab Blur Threshold (Switches before lock)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={maxAllowedBlurs}
                    onChange={(e) => setMaxAllowedBlurs(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    style={{ width: '110px', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontWeight: 700, fontSize: '0.95rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-slate)' }}>
                    Allowed focus losses before exam is locked (inherited from Admin Settings).
                  </span>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoDisqualify}
                  onChange={(e) => setAutoDisqualify(e.target.checked)}
                />
                <span>Automatically disqualify candidate and auto-submit when threshold is exceeded</span>
              </label>
            </div>
          )}
        </div>

        {/* Assigned Problems */}
        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 0 }}>
              Assign Problems to Contest ({selectedProblemIds.length} Selected)
            </label>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCurrentTab('create-problem')}>
              + Create New Problem
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '1rem', color: 'var(--text-slate)' }}>Loading problem repository...</div>
          ) : questions.length === 0 ? (
            <div style={{ padding: '1rem', color: '#ff5252', background: 'rgba(255,82,82,0.1)', borderRadius: 'var(--radius-sm)' }}>
              No problems found in repository. Create at least one problem before hosting a contest!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '300px', overflowY: 'auto', background: 'var(--bg-paper)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              {questions.map(q => {
                const qId = q._id || q.slug;
                const checked = selectedProblemIds.includes(qId);
                return (
                  <label key={qId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: checked ? 'rgba(46, 94, 255, 0.08)' : 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedProblemIds([...selectedProblemIds, qId]);
                          else setSelectedProblemIds(selectedProblemIds.filter(x => x !== qId));
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{q.title}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      <span className={`badge ${q.difficulty === 'Easy' ? 'badge-easy' : q.difficulty === 'Medium' ? 'badge-medium' : 'badge-hard'}`}>
                        {q.difficulty}
                      </span>
                      <span className="badge badge-passed">{q.points || 100} pts</span>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setCurrentTab('admin')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            <Send size={16} /> {submitting ? 'Publishing Contest...' : 'Publish Contest Now'}
          </button>
        </div>
      </form>
    </div>
  );
};
