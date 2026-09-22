import React, { useState, useRef } from 'react';
import { Plus, Search, Edit, Trash2, Code, Play, Filter, Copy, RotateCcw, Download, Upload, CheckSquare, Square, XCircle } from 'lucide-react';
import { ProblemEditorModal } from '../../../components/admin/modals/ProblemEditorModal';
import { QuestionImportModal } from '../../../components/admin/modals/QuestionImportModal';
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

  // Question Multi-Select & Export/Import State
  const [selectedProblemIds, setSelectedProblemIds] = useState(new Set());
  const [exporting, setExporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  const fileInputRef = useRef(null);

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = !search || q.title.toLowerCase().includes(search.toLowerCase()) || (q.tags && q.tags.toString().toLowerCase().includes(search.toLowerCase()));
    const matchesDiff = difficultyFilter === 'All' || q.difficulty === difficultyFilter;
    return matchesSearch && matchesDiff;
  });

  const allFilteredSelected = filteredQuestions.length > 0 && filteredQuestions.every(q => selectedProblemIds.has(String(q._id || q.id)));

  const handleToggleSelectAll = () => {
    setSelectedProblemIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredQuestions.forEach(q => next.delete(String(q._id || q.id)));
      } else {
        filteredQuestions.forEach(q => next.add(String(q._id || q.id)));
      }
      return next;
    });
  };

  const handleToggleProblem = (id) => {
    const sId = String(id);
    setSelectedProblemIds(prev => {
      const next = new Set(prev);
      if (next.has(sId)) {
        next.delete(sId);
      } else {
        next.add(sId);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedProblemIds(new Set());
  };

  const handleOpenCreate = () => {
    setSelectedProblem(null);
    setEditorModalOpen(true);
  };

  const handleOpenEdit = (prob) => {
    setSelectedProblem(prob);
    setEditorModalOpen(true);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const questionIds = Array.from(selectedProblemIds);
      const res = await api.post('/questions/export', { questionIds });

      const exportedData = res.data;
      const count = exportedData.count || (exportedData.questions ? exportedData.questions.length : 0);
      const jsonStr = JSON.stringify(exportedData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timeStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `codearena_questions_export_${timeStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert(err.response?.data?.message || 'Error occurred while exporting questions.');
    } finally {
      setExporting(false);
    }
  };

  const handleImportFileChosen = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const questionsList = Array.isArray(parsed) ? parsed : (parsed.questions || []);
        if (!Array.isArray(questionsList) || questionsList.length === 0) {
          alert('No question definitions found in this JSON file.');
          return;
        }

        setImportData(questionsList);
        setImportFileName(file.name);
        setImportModalOpen(true);
      } catch (err) {
        alert('Failed to parse JSON file. Please ensure the file is valid JSON.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
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
      {/* Hidden File Input for Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFileChosen}
        accept=".json,application/json"
        style={{ display: 'none' }}
      />

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => onRefreshData && onRefreshData()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
            title="Refresh Problem Bank"
          >
            <RotateCcw size={15} />
            Refresh
          </button>

          {/* Export Questions Button */}
          <button
            className="btn btn-secondary"
            onClick={handleExport}
            disabled={exporting || questions.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
            title={selectedProblemIds.size > 0 ? `Export ${selectedProblemIds.size} selected questions` : 'Export all questions in Problem Bank'}
          >
            <Download size={15} />
            {exporting
              ? 'Exporting...'
              : selectedProblemIds.size > 0
                ? `Export Selected (${selectedProblemIds.size})`
                : `Export All (${questions.length})`}
          </button>

          {/* Import Questions Button */}
          <button
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
            title="Import questions from JSON file"
          >
            <Upload size={15} />
            Import Questions
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleRestoreDefaults}
            disabled={restoring}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}
          >
            <RotateCcw size={15} className={restoring ? 'spin' : ''} />
            {restoring ? 'Restoring...' : 'Restore Defaults'}
          </button>

          <button className="btn btn-primary" onClick={handleOpenCreate} style={{ fontSize: '0.84rem' }}>
            <Plus size={16} /> Create Problem
          </button>
        </div>
      </div>

      {/* Floating Selection Banner */}
      {selectedProblemIds.size > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          color: '#1E40AF',
          fontSize: '0.86rem',
          fontWeight: 600,
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckSquare size={17} color="#2563EB" />
            <span>
              <strong>{selectedProblemIds.size}</strong> question{selectedProblemIds.size === 1 ? '' : 's'} selected for batch export
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleExport}
              disabled={exporting}
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Download size={13} />
              {exporting ? 'Exporting...' : `Export Selected (${selectedProblemIds.size})`}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleClearSelection}
              style={{ fontSize: '0.78rem', background: '#FFFFFF' }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', minWidth: '820px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-paper)' }}>
                <th style={{ padding: '0.75rem 0.85rem', width: '42px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={handleToggleSelectAll}
                    style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                    title={allFilteredSelected ? 'Deselect all filtered' : 'Select all filtered'}
                  />
                </th>
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
                  <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No problems match your search filter.
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((q, idx) => {
                  const qId = String(q._id || q.id);
                  const isChecked = selectedProblemIds.has(qId);

                  return (
                    <tr
                      key={qId || idx}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: isChecked ? '#F0F9FF' : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleProblem(qId)}
                          style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                        />
                      </td>
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
                        {q.timeLimit || 2.0}s / {q.memoryLimit || 256}MB
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6-Section Problem Authoring Modal */}
      <ProblemEditorModal
        isOpen={editorModalOpen}
        onClose={() => setEditorModalOpen(false)}
        problemToEdit={selectedProblem}
        onSaveSuccess={onRefreshData}
      />

      {/* Question Import Modal with Interactive Selection & Collision Strategy */}
      <QuestionImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        importData={importData}
        fileName={importFileName}
        existingQuestions={questions}
        onImportSuccess={(count, msg) => {
          if (onRefreshData) onRefreshData();
          alert(msg || `Successfully imported ${count} question(s)!`);
        }}
      />
    </div>
  );
};
