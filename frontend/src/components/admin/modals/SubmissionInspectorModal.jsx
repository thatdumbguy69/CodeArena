import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Clock, Database, Code, Check, AlertTriangle, Copy, ShieldAlert, Cpu } from 'lucide-react';
import Editor from '@monaco-editor/react';
import api from '../../../services/api';

export const SubmissionInspectorModal = ({ isOpen, onClose, submission }) => {
  const [detailData, setDetailData] = useState(submission || null);
  const [loading, setLoading] = useState(false);
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
    setLoading(true);

    api.get(`/submissions/${subId}`)
      .then(res => {
        if (isMounted && res.data?.submission) {
          setDetailData(res.data.submission);
        }
      })
      .catch(err => {
        console.warn('Could not load full submission details:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, submission]);

  // Handle ESC key to close
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
  const testDetails = detailData.details || detailData.testResults || [];
  const antiCheatLogs = detailData.antiCheatLogs || [];
  const blurCount = detailData.blurCount || 0;

  const passedCount = detailData.testCasesPassed ?? detailData.passedTests ?? (testDetails.length > 0 ? testDetails.filter(d => d.status === 'Passed' || d.status === 'Accepted').length : (isAccepted ? 1 : 0));
  const totalCount = detailData.totalTestCases ?? detailData.totalTests ?? (testDetails.length > 0 ? testDetails.length : 1);

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
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
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
          maxWidth: '960px',
          maxHeight: '92vh',
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
          padding: '1.15rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-paper)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 800,
              background: isAccepted ? '#DCFCE7' : '#FEE2E2',
              color: isAccepted ? '#15803D' : '#B91C1C',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              {isAccepted ? <CheckCircle size={15} /> : <XCircle size={15} />}
              {detailData.verdict || detailData.status || 'Evaluated'}
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
              {detailData.questionTitle || detailData.question?.title || 'Submission Details'}
              <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: '0.5rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                #{String(detailData._id || detailData.id || '').substring(0, 8)}
              </span>
            </h3>
          </div>

          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Metadata Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.85rem',
            padding: '1rem',
            background: 'var(--bg-paper)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Team / Group</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-ink)' }}>{detailData.user?.teamName || detailData.teamName || detailData.user?.name || detailData.userName || 'Team'}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Participant</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-ink)' }}>{detailData.user?.name || detailData.userName || 'Candidate'}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Language</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--accent-blue)', textTransform: 'capitalize' }}>{detailData.language || 'python'}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Score Awarded</span>
              <strong style={{ fontSize: '0.88rem', color: isAccepted ? '#15803D' : 'var(--text-ink)' }}>{detailData.score ?? 0} pts</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Execution Time</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-ink)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Clock size={12} color="var(--text-secondary)" />
                {detailData.executionTime ? `${detailData.executionTime} ms` : 'N/A'}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Memory Usage</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-ink)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Database size={12} color="var(--text-secondary)" />
                {detailData.memoryUsed || detailData.memory ? `${detailData.memoryUsed || detailData.memory} KB` : 'N/A'}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Test Cases Passed</span>
              <strong style={{ fontSize: '0.88rem', color: isAccepted ? '#15803D' : '#D97706', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Cpu size={12} />
                {passedCount} / {totalCount}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Integrity / Blurs</span>
              <strong style={{ fontSize: '0.88rem', color: blurCount > 0 ? '#DC2626' : '#15803D' }}>
                {blurCount > 0 ? `⚠️ ${blurCount} violations` : '✓ Clean (0)'}
              </strong>
            </div>
          </div>

          {/* Source Code Viewer */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-ink)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Code size={15} /> Submitted Source Code
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {subCode.length} characters
                </span>

                {subCode && (
                  <button
                    onClick={handleCopyCode}
                    className="btn btn-secondary btn-sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.55rem',
                      fontSize: '0.75rem'
                    }}
                    title="Copy code to clipboard"
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
              height: '300px',
              position: 'relative'
            }}>
              {loading && !subCode ? (
                <div style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#F8FAFC',
                  color: 'var(--text-secondary)',
                  fontSize: '0.88rem'
                }}>
                  Loading source code...
                </div>
              ) : (
                <Editor
                  height="100%"
                  language={getEditorLanguage(detailData.language)}
                  theme="vs"
                  value={subCode || '// No source code recorded for this submission.'}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    fontFamily: 'IBM Plex Mono, monospace',
                    lineNumbers: 'on',
                    tabSize: 4
                  }}
                />
              )}
            </div>
          </div>

          {/* Test Case Breakdown */}
          {testDetails.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-ink)', marginBottom: '0.65rem' }}>
                Test Case Execution Breakdown ({testDetails.length} Test Cases)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {testDetails.map((tc, idx) => {
                  const tcPassed = tc.status === 'Passed' || tc.status === 'Accepted';
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: tcPassed ? 'rgba(34, 197, 94, 0.04)' : 'rgba(239, 68, 68, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {tcPassed ? (
                            <CheckCircle size={15} color="#15803D" />
                          ) : (
                            <XCircle size={15} color="#B91C1C" />
                          )}
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-ink)' }}>
                            Test Case #{tc.testCaseIndex !== undefined ? tc.testCaseIndex + 1 : idx + 1}
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>
                              {tc.isHidden ? '(Hidden Test Case)' : '(Sample Test Case)'}
                            </span>
                          </span>
                        </div>

                        <span style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: tcPassed ? '#15803D' : '#B91C1C'
                        }}>
                          {tc.status || (tcPassed ? 'Passed' : 'Failed')} {tc.executionTime ? `(${tc.executionTime}s)` : ''}
                        </span>
                      </div>

                      {/* Show stderr / error if failed */}
                      {tc.stderr && (
                        <div style={{
                          marginTop: '0.35rem',
                          padding: '0.5rem 0.75rem',
                          background: '#FEF2F2',
                          borderRadius: '4px',
                          border: '1px solid #FCA5A5',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '0.78rem',
                          color: '#B91C1C',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '120px',
                          overflowY: 'auto'
                        }}>
                          {tc.stderr}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Anti-Cheat Violations Log */}
          {(antiCheatLogs.length > 0 || blurCount > 0) && (
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              border: '1px solid #FECACA',
              background: '#FFF5F5'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#B91C1C', fontWeight: 700, fontSize: '0.86rem', marginBottom: '0.4rem' }}>
                <ShieldAlert size={16} />
                Proctoring & Anti-Cheat Integrity Audit ({blurCount} Violations Recorded)
              </div>
              {antiCheatLogs.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#7F1D1D' }}>
                  {antiCheatLogs.map((log, lIdx) => (
                    <li key={lIdx} style={{ marginBottom: '0.2rem' }}>
                      <strong>{log.event || 'Focus lost / Tab switch'}</strong> — {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Recorded'}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#7F1D1D' }}>
                  Participant triggered {blurCount} window blur / tab switch event(s) during this assessment.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '0.85rem 1.5rem',
          background: 'var(--bg-paper)',
          borderTop: '1px solid var(--border-color)',
          gap: '0.75rem'
        }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
