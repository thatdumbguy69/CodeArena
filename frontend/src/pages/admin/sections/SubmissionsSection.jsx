import React, { useState, useEffect } from 'react';
import { FileCode, Search, Filter, Eye, CheckCircle, XCircle, Clock, Database, Trash2, AlertTriangle } from 'lucide-react';
import { SubmissionInspectorModal } from '../../../components/admin/modals/SubmissionInspectorModal';
import { ConfirmActionModal } from '../../../components/admin/modals/ConfirmActionModal';

export const SubmissionsSection = ({
  submissions = [],
  contests = [],
  selectedContestId: propSelectedContestId,
  onSelectContest,
  onDeleteAllSubmissions,
  onDeleteSubmission
}) => {
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('All');

  const getInitialContestFilter = () => {
    if (propSelectedContestId) {
      return (propSelectedContestId === 'all' || propSelectedContestId === 'global' || propSelectedContestId === 'All')
        ? 'All'
        : propSelectedContestId;
    }
    try {
      const stored = sessionStorage.getItem('codearena_admin_selected_contest');
      if (stored) {
        return (stored === 'all' || stored === 'global' || stored === 'All') ? 'All' : stored;
      }
    } catch (e) {}
    return 'All';
  };

  const [contestFilter, setContestFilter] = useState(getInitialContestFilter);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
  const [confirmDeleteSingle, setConfirmDeleteSingle] = useState({ isOpen: false, subId: null });

  useEffect(() => {
    if (propSelectedContestId) {
      const mapped = (propSelectedContestId === 'all' || propSelectedContestId === 'global' || propSelectedContestId === 'All')
        ? 'All'
        : propSelectedContestId;
      setContestFilter(mapped);
    }
  }, [propSelectedContestId]);

  const handleContestChange = (e) => {
    const val = e.target.value;
    setContestFilter(val);
    const syncVal = val === 'All' ? 'global' : val;
    if (onSelectContest) {
      onSelectContest(syncVal);
    } else {
      try {
        sessionStorage.setItem('codearena_admin_selected_contest', syncVal);
      } catch (err) {}
    }
  };

  // Deduplicate submissions by unique ID
  const seenIds = new Set();
  const deduplicatedSubmissions = submissions.filter(sub => {
    const id = String(sub._id || sub.id || '');
    if (!id || seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });

  const filteredSubmissions = deduplicatedSubmissions.filter(sub => {
    // 1. Contest Filter
    if (contestFilter !== 'All') {
      if (contestFilter === 'practice') {
        if (sub.contest) return false;
      } else {
        const subContestId = String(sub.contest?._id || sub.contest || '');
        if (subContestId !== String(contestFilter)) return false;
      }
    }

    // 2. Verdict Filter
    const matchesResult = resultFilter === 'All' || sub.verdict === resultFilter || sub.status === resultFilter;
    if (!matchesResult) return false;

    // 3. Text Search
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const candidateName = (sub.user?.name || sub.userName || '').toLowerCase();
    const teamName = (sub.user?.teamName || sub.teamName || '').toLowerCase();
    const email = (sub.user?.email || sub.email || '').toLowerCase();
    const lang = (sub.language || '').toLowerCase();
    const subId = String(sub._id || sub.id || '').toLowerCase();
    const problemTitle = (sub.question?.title || sub.questionTitle || '').toLowerCase();

    return candidateName.includes(term) ||
      teamName.includes(term) ||
      email.includes(term) ||
      lang.includes(term) ||
      subId.includes(term) ||
      problemTitle.includes(term);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
            Centralized Code Submissions Log
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Inspect candidate source code, execution metrics, testcases, and anti-cheat history. Total Submissions: <strong>{deduplicatedSubmissions.length}</strong>
          </span>
        </div>

        {/* Delete All Submissions Action */}
        <button
          onClick={() => setConfirmDeleteAllOpen(true)}
          disabled={deduplicatedSubmissions.length === 0}
          className="btn btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: '#FEF2F2',
            color: '#B91C1C',
            border: '1.5px solid #FCA5A5',
            borderRadius: '7px',
            fontWeight: 700,
            fontSize: '0.84rem',
            padding: '0.55rem 1rem',
            cursor: deduplicatedSubmissions.length === 0 ? 'not-allowed' : 'pointer',
            opacity: deduplicatedSubmissions.length === 0 ? 0.5 : 1,
            transition: 'all 0.15s ease'
          }}
          title={deduplicatedSubmissions.length === 0 ? 'No submissions to delete' : `Delete all ${deduplicatedSubmissions.length} submissions`}
        >
          <Trash2 size={15} />
          Delete All Submissions ({deduplicatedSubmissions.length})
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '220px' }}>
          <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search submission ID, candidate, team, email, problem..."
            style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.25rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
          />
        </div>

        {/* Individual Contest Dropdown Filter */}
        <select
          value={contestFilter}
          onChange={handleContestChange}
          style={{ padding: '0.55rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#FFF', fontWeight: 600, fontSize: '0.88rem' }}
        >
          <option value="All">🌐 All / Global Submissions</option>
          <option value="practice">💻 Practice Arena Submissions</option>
          {contests.map(c => (
            <option key={c._id || c.id} value={c._id || c.id}>
              🏆 {c.title} ({c.status || 'Contest'})
            </option>
          ))}
        </select>

        {/* Verdict Filter */}
        <select
          value={resultFilter}
          onChange={e => setResultFilter(e.target.value)}
          style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#FFF', fontSize: '0.88rem' }}
        >
          <option value="All">All Verdicts</option>
          <option value="Accepted">Accepted</option>
          <option value="Wrong Answer">Wrong Answer</option>
          <option value="Time Limit Exceeded">Time Limit Exceeded</option>
          <option value="Compile Error">Compilation Error</option>
          <option value="Runtime Error">Runtime Error</option>
        </select>
      </div>

      {/* Submissions Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', minWidth: '820px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-paper)' }}>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Sub ID</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Team / Group Name</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Participant Name</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Problem</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Language</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Exec Time</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Violations</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Verdict</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No code submissions recorded matching filter.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub, idx) => {
                  const isAcc = sub.verdict === 'Accepted' || sub.status === 'Accepted';
                  const blurs = sub.blurCount || (sub.antiCheatLogs ? sub.antiCheatLogs.length : 0);
                  return (
                    <tr key={sub._id || sub.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        #{String(sub._id || sub.id || '').substring(0, 8)}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: 'var(--text-ink)', maxWidth: '160px', wordBreak: 'break-word' }}>
                        {sub.user?.teamName || sub.teamName || sub.user?.name || sub.userName || 'Team'}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, maxWidth: '150px', wordBreak: 'break-word' }}>
                        <div>{sub.user?.name || sub.userName || 'Candidate'}</div>
                        {(sub.user?.email || sub.email) && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            {sub.user?.email || sub.email}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, maxWidth: '160px', wordBreak: 'break-word' }}>
                        {sub.question?.title || sub.questionTitle || 'Problem'}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textTransform: 'capitalize', color: 'var(--accent-blue)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {sub.language || 'python'}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {sub.executionTime !== undefined ? `${sub.executionTime} ms` : 'N/A'}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: blurs > 0 ? '#FEE2E2' : '#F1F5F9',
                          color: blurs > 0 ? '#DC2626' : '#64748B'
                        }}>
                          {blurs > 0 ? `⚠️ ${blurs} blurs` : '0 blurs'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: isAcc ? '#DCFCE7' : '#FEE2E2',
                          color: isAcc ? '#15803D' : '#B91C1C',
                          display: 'inline-block'
                        }}>
                          {sub.verdict || sub.status || 'Evaluated'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedSubmission(sub)} style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Eye size={13} /> Inspect Code
                          </button>
                          {onDeleteSubmission && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setConfirmDeleteSingle({ isOpen: true, subId: sub._id || sub.id })}
                              style={{ color: '#DC2626', padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}
                              title="Delete Submission"
                            >
                              <Trash2 size={13} />
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

      <SubmissionInspectorModal
        isOpen={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        submission={selectedSubmission}
      />

      {/* Confirm Delete All Submissions Modal */}
      <ConfirmActionModal
        isOpen={confirmDeleteAllOpen}
        onClose={() => setConfirmDeleteAllOpen(false)}
        onConfirm={() => {
          setConfirmDeleteAllOpen(false);
          onDeleteAllSubmissions && onDeleteAllSubmissions();
        }}
        title={`⚠️ Delete All ${submissions.length} Submissions`}
        message={`Are you sure you want to permanently delete ALL ${submissions.length} code submissions across all problems and contests? This will reset problem accepted counts and candidate scores. This action CANNOT be undone.`}
        confirmText="Yes, Delete All Submissions"
        danger={true}
        requireTypedConfirmation={true}
        confirmationKeyword="DELETE ALL"
      />

      {/* Confirm Delete Single Submission Modal */}
      <ConfirmActionModal
        isOpen={confirmDeleteSingle.isOpen}
        onClose={() => setConfirmDeleteSingle({ isOpen: false, subId: null })}
        onConfirm={() => {
          const id = confirmDeleteSingle.subId;
          setConfirmDeleteSingle({ isOpen: false, subId: null });
          if (id && onDeleteSubmission) onDeleteSubmission(id);
        }}
        title="Delete Submission Record"
        message="Are you sure you want to permanently delete this code submission record?"
        confirmText="Delete Submission"
        danger={true}
        requireTypedConfirmation={false}
      />
    </div>
  );
};
