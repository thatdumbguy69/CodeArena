import React, { useState } from 'react';
import { Send, Search, Filter, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { SubmissionDetailModal } from '../../../components/student/modals/SubmissionDetailModal';

export const StudentSubmissionsSection = ({
  submissions = []
}) => {
  const [search, setSearch] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('All');
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = !search ||
      (sub.questionTitle && sub.questionTitle.toLowerCase().includes(search.toLowerCase())) ||
      (sub.language && sub.language.toLowerCase().includes(search.toLowerCase()));
    const matchesVerdict = verdictFilter === 'All' || sub.verdict === verdictFilter || sub.status === verdictFilter;
    return matchesSearch && matchesVerdict;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
          My Submission History & Logs
        </h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-slate)' }}>
          Inspect your historical code submissions, execution times, and Judge0 evaluation verdicts.
        </span>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '220px' }}>
          <Search size={16} color="var(--text-slate)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search submission title or language..."
            style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.25rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
          />
        </div>

        <select
          value={verdictFilter}
          onChange={e => setVerdictFilter(e.target.value)}
          style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#FFF' }}
        >
          <option value="All">All Verdicts</option>
          <option value="Accepted">Accepted</option>
          <option value="Wrong Answer">Wrong Answer</option>
          <option value="Time Limit Exceeded">Time Limit Exceeded</option>
          <option value="Compilation Error">Compilation Error</option>
        </select>
      </div>

      {/* Submissions Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-paper)' }}>
              <th style={{ padding: '0.85rem 1.25rem' }}>Problem Title</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Verdict</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Language</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Exec Time</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Score</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Submitted At</th>
              <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Inspect Code</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubmissions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-slate)' }}>
                  You have not submitted any solutions yet.
                </td>
              </tr>
            ) : (
              filteredSubmissions.map((sub, idx) => {
                const isAcc = sub.verdict === 'Accepted' || sub.status === 'Accepted';
                return (
                  <tr key={sub._id || sub.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: 'var(--text-ink)' }}>
                      {sub.questionTitle || 'Two Sum'}
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <span style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: isAcc ? '#DCFCE7' : '#FEE2E2',
                        color: isAcc ? '#15803D' : '#B91C1C'
                      }}>
                        {sub.verdict || sub.status || 'Evaluated'}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem', textTransform: 'capitalize', color: 'var(--accent-blue)', fontWeight: 600 }}>
                      {sub.language || 'python'}
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.82rem' }}>
                      {sub.executionTime ? `${sub.executionTime} ms` : 'N/A'}
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700 }}>
                      {sub.score || 100} pts
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-slate)' }}>
                      {new Date(sub.createdAt || Date.now()).toLocaleString()}
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedSubmission(sub)}>
                        <Eye size={14} /> View Code
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <SubmissionDetailModal
        isOpen={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        submission={selectedSubmission}
      />
    </div>
  );
};
