import React from 'react';
import { X, CheckCircle, XCircle, Clock, Database, Code, Check, AlertCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';

export const SubmissionInspectorModal = ({ isOpen, onClose, submission }) => {
  if (!isOpen || !submission) return null;

  const isAccepted = submission.verdict === 'Accepted' || submission.status === 'Accepted' || submission.status === 'Passed';

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
        maxWidth: '900px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: isAccepted ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: isAccepted ? '#15803D' : '#B91C1C',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              {isAccepted ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {submission.verdict || submission.status || 'Evaluated'}
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-ink)' }}>
              Submission #{String(submission._id || submission.id || '').substring(0, 8)}
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            padding: '1rem',
            background: 'var(--bg-paper)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            marginBottom: '1.25rem'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Team / Group</span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-ink)' }}>{submission.user?.teamName || submission.teamName || submission.user?.name || submission.userName || 'Team'}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Participant</span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-ink)' }}>{submission.user?.name || submission.userName || 'Anonymous'}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Language</span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--accent-blue)', textTransform: 'capitalize' }}>{submission.language || 'python'}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Execution Time</span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-ink)' }}>
                <Clock size={12} style={{ marginRight: '4px' }} />
                {submission.executionTime ? `${submission.executionTime} ms` : 'N/A'}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Memory Usage</span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-ink)' }}>
                <Database size={12} style={{ marginRight: '4px' }} />
                {submission.memory ? `${submission.memory} KB` : 'N/A'}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Test Cases</span>
              <strong style={{ fontSize: '0.9rem', color: isAccepted ? '#15803D' : 'var(--text-ink)' }}>
                {submission.passedTests !== undefined ? `${submission.passedTests} / ${submission.totalTests}` : '100%'}
              </strong>
            </div>
          </div>

          {/* Submitted Code Viewer */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-ink)' }}>Source Code</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>
                {submission.code?.length || 0} characters
              </span>
            </div>
            <div style={{
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
              height: '260px'
            }}>
              <Editor
                height="100%"
                language={submission.language === 'cpp' || submission.language === 'c' ? 'cpp' : (submission.language || 'python')}
                theme="vs"
                value={submission.code || '// No code recorded'}
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

          {/* Test Results Breakdown */}
          {submission.testResults && submission.testResults.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-ink)', marginBottom: '0.75rem' }}>
                Test Case Execution Breakdown
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {submission.testResults.map((tc, idx) => (
                  <div key={idx} style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: tc.status === 'Passed' || tc.status === 'Accepted' ? 'rgba(34, 197, 94, 0.04)' : 'rgba(239, 68, 68, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {tc.status === 'Passed' || tc.status === 'Accepted' ? (
                        <Check size={16} color="#15803D" />
                      ) : (
                        <X size={16} color="#B91C1C" />
                      )}
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Test Case #{idx + 1} {tc.isHidden ? '(Hidden)' : '(Sample)'}</span>
                    </div>

                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: tc.status === 'Passed' || tc.status === 'Accepted' ? '#15803D' : '#B91C1C'
                    }}>
                      {tc.status} {tc.executionTime ? `(${tc.executionTime}ms)` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
