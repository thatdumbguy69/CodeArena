import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Code, Play, Filter, Copy, RotateCcw } from 'lucide-react';
import { ProblemEditorModal } from '../../../components/admin/modals/ProblemEditorModal';
import api from '../../../services/api';

export const ProblemBankSection = ({
  questions = [],
  onRefreshData,
  onDeleteProblem
}) => {
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [restoring, setRestoring] = useState(false);

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = !search || q.title.toLowerCase().includes(search.toLowerCase()) || (q.tags && q.tags.toString().toLowerCase().includes(search.toLowerCase()));
    const matchesDiff = difficultyFilter === 'All' || q.difficulty === difficultyFilter;
    return matchesSearch && matchesDiff;
  });

  const handleOpenCreate = () => {
    setSelectedProblem(null);
    setEditorModalOpen(true);
  };

  const handleOpenEdit = (prob) => {
    setSelectedProblem(prob);
    setEditorModalOpen(true);
  };

  const handleRestoreDefaults = async () => {
    if (!window.confirm('Restore all default problems into the Problem Bank?')) return;
    try {
      setRestoring(true);
      await api.post('/questions/restore-defaults');
      if (onRefreshData) await onRefreshData();
      alert('All default problems have been restored successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error restoring problems');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
            Problem Repository &amp; Bank
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Author, test, and manage programming problem statements. Total Problems in Bank: <strong>{questions.length}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => onRefreshData && onRefreshData()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
            title="Refresh Problem Bank"
          >
            <RotateCcw size={15} />
            Refresh
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleRestoreDefaults}
            disabled={restoring}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}
          >
            <RotateCcw size={15} className={restoring ? 'spin' : ''} />
            {restoring ? 'Restoring...' : 'Restore Default Problems'}
          </button>
          <button className="btn btn-primary" onClick={handleOpenCreate} style={{ fontSize: '0.84rem' }}>
            <Plus size={16} /> Create Problem (6-Section Editor)
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '220px' }}>
          <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, slug, or tags..."
            style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.25rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} color="var(--text-secondary)" />
          <select
            value={difficultyFilter}
            onChange={e => setDifficultyFilter(e.target.value)}
            style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#FFF' }}
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Problem Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', minWidth: '760px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-paper)' }}>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Problem Title</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Visibility</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Difficulty</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Points</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Time / Memory</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Tags</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No problems match your search filter.
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((q, idx) => (
                  <tr key={q._id || q.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: 'var(--text-ink)', maxWidth: '200px', wordBreak: 'break-word' }}>
                      {q.title}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap' }}>
                      <span style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: q.isPublic !== false ? '#ECFDF5' : '#FEF3C7',
                        color: q.isPublic !== false ? '#047857' : '#B45309',
                        display: 'inline-block'
                      }}>
                        {q.isPublic !== false ? '🌐 Public' : '🔒 Private (Contest)'}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: q.difficulty === 'Easy' ? '#DCFCE7' : (q.difficulty === 'Medium' ? '#FEF3C7' : '#FEE2E2'),
                        color: q.difficulty === 'Easy' ? '#15803D' : (q.difficulty === 'Medium' ? '#D97706' : '#DC2626'),
                        display: 'inline-block'
                      }}>
                        {q.difficulty || 'Medium'}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: 'var(--accent-blue)', whiteSpace: 'nowrap' }}>
                      {q.points || 100} pts
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {q.timeLimit || 2000}ms / {q.memoryLimit || 256}MB
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={Array.isArray(q.tags) ? q.tags.join(', ') : (q.tags || 'General')}>
                      {Array.isArray(q.tags) ? q.tags.join(', ') : (q.tags || 'General')}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(q)} style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Edit size={13} /> Edit
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => onDeleteProblem(q._id || q.id)} style={{ color: '#DC2626', padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5-Section Problem Authoring Modal */}
      <ProblemEditorModal
        isOpen={editorModalOpen}
        onClose={() => setEditorModalOpen(false)}
        problemToEdit={selectedProblem}
        onSaveSuccess={onRefreshData}
      />
    </div>
  );
};
