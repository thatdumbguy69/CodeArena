import React, { useState } from 'react';
import { Users, Search, Filter, ShieldAlert, Eye } from 'lucide-react';
import { ParticipantDetailsModal } from '../../../components/admin/modals/ParticipantDetailsModal';

export const ParticipantsSection = ({
  usersList = [],
  contests = []
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  const students = usersList.filter(u => u.role === 'student' || u.role !== 'admin');

  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      (s.teamName && s.teamName.toLowerCase().includes(q)) ||
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q));
    const isDisq = s.isDisqualified || s.tabBlurCount >= 3;
    let matchesStatus = true;
    if (statusFilter === 'Disqualified') matchesStatus = isDisq;
    if (statusFilter === 'Active') matchesStatus = !isDisq;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
          Participant Management Directory
        </h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Monitor contest registrations, scores, and integrity records.
        </span>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '220px' }}>
          <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search team name, participant, or email..."
            style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.25rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#FFF' }}
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active / Normal</option>
          <option value="Disqualified">Disqualified</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', minWidth: '760px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-paper)' }}>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Team / Group Name</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Participant Name</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Email</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'right' }}>Score</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Solved Count</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Tab Blurs</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No participants found matching filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => {
                  const isDisq = s.isDisqualified || (s.tabBlurCount || 0) >= 3;
                  return (
                    <tr key={s._id || s.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: 'var(--text-ink)', maxWidth: '160px', wordBreak: 'break-word' }}>
                        {s.teamName || s.name}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-ink)', maxWidth: '150px', wordBreak: 'break-word' }}>
                        {s.name}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.email}>
                        {s.email}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: 'var(--accent-blue)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {s.score || 0} pts
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#15803D', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {s.solvedCount || 0}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: s.tabBlurCount > 0 ? '#DC2626' : 'var(--text-ink)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {s.tabBlurCount || 0} / 3
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: isDisq ? '#FEE2E2' : '#DCFCE7',
                          color: isDisq ? '#DC2626' : '#15803D'
                        }}>
                          {isDisq ? 'DISQUALIFIED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedParticipant(s)}
                          style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Eye size={13} /> View Details
                        </button>
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
      />
    </div>
  );
};
