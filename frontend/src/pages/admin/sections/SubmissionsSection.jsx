import React, { useState } from 'react';
import { FileCode, Search, Filter, Eye, CheckCircle, XCircle, Clock, Database, Trash2, AlertTriangle } from 'lucide-react';
import { SubmissionInspectorModal } from '../../../components/admin/modals/SubmissionInspectorModal';
import { ConfirmActionModal } from '../../../components/admin/modals/ConfirmActionModal';

export const SubmissionsSection = ({
  submissions = [],
  onDeleteAllSubmissions,
  onDeleteSubmission
}) => {
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('All');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
  const [confirmDeleteSingle, setConfirmDeleteSingle] = useState({ isOpen: false, subId: null });

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = !search ||
      (sub.user?.name && sub.user.name.toLowerCase().includes(search.toLowerCase())) ||
      (sub.user?.teamName && sub.user.teamName.toLowerCase().includes(search.toLowerCase())) ||
      (sub.userName && sub.userName.toLowerCase().includes(search.toLowerCase())) ||
      (sub.language && sub.language.toLowerCase().includes(search.toLowerCase())) ||
      (String(sub._id || sub.id).includes(search));
    const matchesResult = resultFilter === 'All' || sub.verdict === resultFilter || sub.status === resultFilter;
    return matchesSearch && matchesResult;
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
            Inspect candidate source code, execution metrics, and Judge0 evaluation verdicts. Total Submissions: <strong>{submissions.length}</strong>
          </span>
        </div>

        {/* Delete All Submissions Action */}
        <button
          onClick={() => setConfirmDeleteAllOpen(true)}
          disabled={submissions.length === 0}
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
            cursor: submissions.length === 0 ? 'not-allowed' : 'pointer',
            opacity: submissions.length === 0 ? 0.5 : 1,
            transition: 'all 0.15s ease'
          }}
          title={submissions.length === 0 ? 'No submissions to delete' : `Delete all ${submissions.length} submissions`}
        >
          <Trash2 size={15} />
          Delete All Submissions ({submissions.length})
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '220px' }}>
          <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search submission ID, team name, candidate..."
            style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.25rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
          />
        </div>

        <select
          value={resultFilter}
          onChange={e => setResultFilter(e.target.value)}
          style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#FFF' }}
        >
          <option value="All">All Verdicts</option>
          <option value="Accepted">Accepted</option>
          <option value="Wrong Answer">Wrong Answer</option>
          <option value="Time Limit Exceeded">Time Limit Exceeded</option>
          <option value="Compilation Error">Compilation Error</option>
          <option value="Runtime Error">Runtime Error</option>
        </select>
      </div>

      {/* Submissions Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', minWidth: '760px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-paper)' }}>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Sub ID</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Team / Group Name</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Participant Name</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Language</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Exec Time</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Memory</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Verdict</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No code submissions recorded matching filter.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub, idx) => {
                  const isAcc = sub.verdict === 'Accepted' || sub.status === 'Accepted';
                  return (
                    <tr key={sub._id || sub.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        #{String(sub._id || sub.id || '').substring(0, 8)}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: 'var(--text-ink)', maxWidth: '160px', wordBreak: 'break-word' }}>
                        {sub.user?.teamName || sub.teamName || sub.user?.name || sub.userName || 'Team'}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, maxWidth: '150px', wordBreak: 'break-word' }}>
                        {sub.user?.name || sub.userName || 'Candidate'}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textTransform: 'capitalize', color: 'var(--accent-blue)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {sub.language || 'python'}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {sub.executionTime ? `${sub.executionTime} ms` : 'N/A'}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {sub.memory ? `${sub.memory} KB` : 'N/A'}
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
