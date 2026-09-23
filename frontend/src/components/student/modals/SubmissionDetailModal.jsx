import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Clock, Database, Code, Check, Copy } from 'lucide-react';
import Editor from '@monaco-editor/react';
import api from '../../../services/api';

export const SubmissionDetailModal = ({ isOpen, onClose, submission }) => {
  const [detailData, setDetailData] = useState(submission || null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !submission) {
      setDetailData(null);
      return;
    }

    setDetailData(submission);
    const subId = submission._id || submission.id;
    if (!subId) return;

    let isMounted = true;
    api.get(`/submissions/${subId}`)
      .then(res => {
        if (isMounted && res.data?.submission) {
          setDetailData(res.data.submission);
        }
      })
      .catch(err => {
        console.warn('Could not load full submission detail:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, submission]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !detailData) return null;

  const isAccepted = detailData.verdict === 'Accepted' || detailData.status === 'Accepted' || detailData.status === 'Passed';
  const subCode = detailData.code || '';

  const handleCopyCode = () => {
    if (!subCode) return;
    navigator.clipboard.writeText(subCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const getEditorLanguage = (lang) => {
    const l = String(lang || 'python').toLowerCase();
    if (l === 'cpp' || l === 'c' || l === 'c++') return 'cpp';
    if (l === 'java') return 'java';
    if (l === 'javascript' || l === 'js') return 'javascript';
    return 'python';
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.5rem'
      }}
    >
      <div
        className="glass-card"
        onClick={e => e.stopPropagation()}
        style={{
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
        }}
      >
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
              {detailData.verdict || detailData.status || 'Evaluated'}
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-ink)' }}>
              {detailData.questionTitle || detailData.question?.title || 'Submission Details'}
            </h3>
          </div>

          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
            title="Close"
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
              <strong style={{ fontSize: '0.9rem', color: 'var(--accent-blue)', textTransform: 'capitalize' }}>{detailData.language || 'python'}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Score Awarded</span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-ink)' }}>{detailData.score || 100} pts</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Execution Time</span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-ink)' }}>
                <Clock size={12} style={{ marginRight: '4px' }} />
                {detailData.executionTime ? `${detailData.executionTime} ms` : 'N/A'}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Submitted At</span>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {new Date(detailData.createdAt || Date.now()).toLocaleString()}
              </strong>
            </div>
          </div>

          {/* Submitted Code Viewer */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-ink)' }}>Submitted Source Code</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {subCode.length} characters
                </span>
                {subCode && (
                  <button
                    onClick={handleCopyCode}
                    className="btn btn-secondary btn-sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.75rem'
                    }}
                    title="Copy code"
                  >
                    {copied ? <Check size={12} color="#15803D" /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                )}
              </div>
            </div>

            <div style={{
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
              height: '320px'
            }}>
              <Editor
                height="100%"
                language={getEditorLanguage(detailData.language)}
                theme="vs"
                value={subCode || '// Source code recorded'}
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
