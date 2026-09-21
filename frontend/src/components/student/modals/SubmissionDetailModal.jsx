import React from 'react';
import { X, CheckCircle, XCircle, Clock, Database, Code, Check } from 'lucide-react';
import Editor from '@monaco-editor/react';

export const SubmissionDetailModal = ({ isOpen, onClose, submission }) => {
  if (!isOpen || !submission) return null;

  const isAccepted = submission.verdict === 'Accepted' || submission.status === 'Accepted';

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.5rem'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '850px',
        maxHeight: '88vh',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: isAccepted ? '#DCFCE7' : '#FEE2E2',
              color: isAccepted ? '#15803D' : '#B91C1C',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              {isAccepted ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {submission.verdict || submission.status || 'Evaluated'}
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-ink)' }}>
              {submission.questionTitle || 'Submission Details'}
            </h3>
          </div>

          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* Metadata Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
            padding: '1rem',
            background: 'var(--bg-paper)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            marginBottom: '1.25rem'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Language</span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--accent-blue)', textTransform: 'capitalize' }}>{submission.language || 'python'}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Score Awarded</span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-ink)' }}>{submission.score || 100} pts</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Execution Time</span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-ink)' }}>
                <Clock size={12} style={{ marginRight: '4px' }} />
                {submission.executionTime ? `${submission.executionTime} ms` : 'N/A'}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Submitted At</span>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {new Date(submission.createdAt || Date.now()).toLocaleString()}
              </strong>
            </div>
          </div>

          {/* Submitted Code Viewer */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-ink)' }}>Submitted Source Code</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>
                {submission.code?.length || 0} characters
              </span>
            </div>

            <div style={{
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
              height: '320px'
            }}>
              <Editor
                height="100%"
                language={submission.language === 'cpp' || submission.language === 'c' ? 'cpp' : (submission.language || 'python')}
                theme="vs"
                value={submission.code || '// Source code recorded'}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  fontFamily: 'IBM Plex Mono, monospace'
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '1rem 1.5rem',
          background: 'var(--bg-paper)',
          borderTop: '1px solid var(--border-color)'
        }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  );
};
