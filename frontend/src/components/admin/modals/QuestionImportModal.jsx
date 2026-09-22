import React, { useState, useEffect } from 'react';
import { X, Check, Upload, FileCode, CheckCircle, AlertTriangle, AlertCircle, Database, Settings, Code, Layers } from 'lucide-react';
import api from '../../../services/api';

export const QuestionImportModal = ({
  isOpen,
  onClose,
  importData = [],
  fileName = '',
  existingQuestions = [],
  onImportSuccess
}) => {
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [collisionStrategy, setCollisionStrategy] = useState('suffix'); // 'suffix' | 'overwrite' | 'skip'
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Normalize questions array
  const questionsList = Array.isArray(importData) ? importData : (importData?.questions || []);

  // Check if a question already exists by slug or title
  const checkExists = (q) => {
    if (!q) return false;
    const title = (q.title || '').trim().toLowerCase();
    const slug = (q.slug || '').trim().toLowerCase();
    return existingQuestions.some(existing => {
      const eTitle = (existing.title || '').trim().toLowerCase();
      const eSlug = (existing.slug || '').trim().toLowerCase();
      return (title && eTitle === title) || (slug && eSlug === slug);
    });
  };

  // Select all by default when opened with fresh data
  useEffect(() => {
    if (isOpen && questionsList.length > 0) {
      setSelectedIndices(new Set(questionsList.map((_, i) => i)));
      setErrorMsg('');
      setImporting(false);
    }
  }, [isOpen, questionsList]);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (selectedIndices.size === questionsList.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(questionsList.map((_, i) => i)));
    }
  };

  const toggleRow = (idx) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleExecuteImport = async () => {
    if (selectedIndices.size === 0) {
      setErrorMsg('Please select at least one question to import.');
      return;
    }

    try {
      setImporting(true);
      setErrorMsg('');

      const selectedQuestions = questionsList.filter((_, idx) => selectedIndices.has(idx));

      const res = await api.post('/questions/import', {
        questions: selectedQuestions,
        collisionStrategy
      });

      if (onImportSuccess) {
        onImportSuccess(res.data?.importedCount || selectedQuestions.length, res.data?.message || 'Questions imported successfully');
      }
      onClose();
    } catch (err) {
      console.error('Import questions failed:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Error occurred while importing questions.');
    } finally {
      setImporting(false);
    }
  };

  const isAllSelected = questionsList.length > 0 && selectedIndices.size === questionsList.length;

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.5rem'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '920px',
        maxHeight: '90vh',
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-paper)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#DBEAFE',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Upload size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
                  Import Questions to Problem Bank
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  File: <strong style={{ color: 'var(--text-ink)' }}>{fileName || 'questions.json'}</strong> ({questionsList.length} problems detected)
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={importing}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Collision Strategy Config */}
        <div style={{
          padding: '0.85rem 1.5rem',
          background: '#F8FAFC',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-ink)' }}>
            <Layers size={15} color="var(--accent-blue)" />
            <span>If problem slug or title already exists:</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8rem',
              fontWeight: collisionStrategy === 'suffix' ? 700 : 500,
              cursor: 'pointer',
              color: collisionStrategy === 'suffix' ? '#1D4ED8' : 'var(--text-slate)'
            }}>
              <input
                type="radio"
                name="collisionStrategy"
                value="suffix"
                checked={collisionStrategy === 'suffix'}
                onChange={() => setCollisionStrategy('suffix')}
              />
              Auto-Suffix (Safe Copy)
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8rem',
              fontWeight: collisionStrategy === 'overwrite' ? 700 : 500,
              cursor: 'pointer',
              color: collisionStrategy === 'overwrite' ? '#B45309' : 'var(--text-slate)'
            }}>
              <input
                type="radio"
                name="collisionStrategy"
                value="overwrite"
                checked={collisionStrategy === 'overwrite'}
                onChange={() => setCollisionStrategy('overwrite')}
              />
              Overwrite Existing
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8rem',
              fontWeight: collisionStrategy === 'skip' ? 700 : 500,
              cursor: 'pointer',
              color: collisionStrategy === 'skip' ? '#475569' : 'var(--text-slate)'
            }}>
              <input
                type="radio"
                name="collisionStrategy"
                value="skip"
                checked={collisionStrategy === 'skip'}
                onChange={() => setCollisionStrategy('skip')}
              />
              Skip Existing
            </label>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            padding: '0.75rem 1.5rem',
            background: '#FEE2E2',
            color: '#B91C1C',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderBottom: '1px solid #FCA5A5'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Multi-Selection Control Bar */}
        <div style={{
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          background: '#FFFFFF'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', color: 'var(--text-ink)' }}>
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
          </label>

          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Selected: <strong style={{ color: 'var(--accent-blue)' }}>{selectedIndices.size}</strong> of {questionsList.length} questions
          </span>
        </div>

        {/* Questions Interactive Preview List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {questionsList.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No valid questions found in the selected file.
            </div>
          ) : (
            questionsList.map((q, idx) => {
              const isSelected = selectedIndices.has(idx);
              const exists = checkExists(q);
              const testCases = q.testCases || [];
              const publicCount = testCases.filter(tc => !tc.isHidden).length;
              const hiddenCount = testCases.filter(tc => tc.isHidden).length;
              const allowedLangs = q.allowedLanguages || ['python', 'cpp', 'c', 'java', 'javascript'];
              const hasStarter = q.starterCode && typeof q.starterCode === 'object' && Object.keys(q.starterCode).length > 0;
              const hasRef = q.referenceSolution && typeof q.referenceSolution === 'object' && Object.keys(q.referenceSolution).some(k => Boolean(q.referenceSolution[k]));

              return (
                <div
                  key={idx}
                  onClick={() => toggleRow(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: `1px solid ${isSelected ? '#93C5FD' : '#E2E8F0'}`,
                    background: isSelected ? '#F0F9FF' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleRow(idx)}
                    onClick={e => e.stopPropagation()}
                    style={{ marginTop: '0.2rem', width: '16px', height: '16px', cursor: 'pointer' }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title & Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-ink)' }}>
                          {q.title || `Question ${idx + 1}`}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-slate)', fontFamily: 'monospace' }}>
                          /{q.slug || 'auto-slug'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {exists ? (
                          <span style={{
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: '#FEF3C7',
                            color: '#B45309',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <AlertTriangle size={12} /> Already in Bank
                          </span>
                        ) : (
                          <span style={{
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: '#DCFCE7',
                            color: '#15803D',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <CheckCircle size={12} /> New
                          </span>
                        )}

                        <span style={{
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: q.difficulty === 'Easy' ? '#DCFCE7' : (q.difficulty === 'Medium' ? '#FEF3C7' : '#FEE2E2'),
                          color: q.difficulty === 'Easy' ? '#15803D' : (q.difficulty === 'Medium' ? '#D97706' : '#DC2626')
                        }}>
                          {q.difficulty || 'Easy'}
                        </span>

                        <span style={{
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: '#EFF6FF',
                          color: '#2563EB'
                        }}>
                          {q.points || 100} pts
                        </span>
                      </div>
                    </div>

                    {/* Criteria Spec Chips (6 Parts Retained) */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <span style={{ background: '#F1F5F9', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                        📂 {q.category || 'Algorithms'}
                      </span>

                      <span style={{ background: '#F1F5F9', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                        ⚡ {testCases.length} Testcases ({publicCount} public, {hiddenCount} hidden)
                      </span>

                      <span style={{ background: '#F1F5F9', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                        ⏱ {q.timeLimit || 2.0}s / {q.memoryLimit || 256}MB
                      </span>

                      <span style={{ background: '#F1F5F9', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                        💻 {allowedLangs.length} Langs
                      </span>

                      {hasStarter && (
                        <span style={{ background: '#ECFDF5', color: '#047857', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                          ✓ Boilerplates
                        </span>
                      )}

                      {hasRef && (
                        <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #BFDBFE' }}>
                          ✓ Ref Solution
                        </span>
                      )}

                      {q.tags && Array.isArray(q.tags) && q.tags.length > 0 && (
                        <span style={{ background: '#F3F4F6', color: '#4B5563', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                          🏷 {q.tags.slice(0, 3).join(', ')}{q.tags.length > 3 ? ` +${q.tags.length - 3}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          background: 'var(--bg-paper)',
          borderTop: '1px solid var(--border-color)'
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={importing}
            style={{ fontSize: '0.84rem' }}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExecuteImport}
            disabled={importing || selectedIndices.size === 0}
            style={{ fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Upload size={15} />
            {importing ? 'Importing Questions...' : `Import Selected (${selectedIndices.size})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionImportModal;
