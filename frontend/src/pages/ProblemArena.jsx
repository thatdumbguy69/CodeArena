import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Play, Send, RotateCcw, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { CompileErrorDisplay } from '../components/common/CompileErrorDisplay';

export const ProblemArena = ({ problemSlug, onBack }) => {
  const { user } = useAuth();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [activeTab, setActiveTab] = useState('problem');
  const [customInput, setCustomInput] = useState('');

  const [executing, setExecuting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResults, setRunResults] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [pastSubmissions, setPastSubmissions] = useState([]);
  const [bottomPanelTab, setBottomPanelTab] = useState('results');

  useEffect(() => {
    fetchQuestionDetails();
    fetchSubmissionHistory();
  }, [problemSlug]);

  const fetchQuestionDetails = async () => {
    try {
      setLoading(true);
      setError('');
      setRunResults(null);
      setSubmissionResult(null);
      const res = await api.get(`/questions/${problemSlug}`);
      const q = res.data.question;
      setQuestion(q);

      const pKey = q._id || q.slug || problemSlug;
      let initialCode = '';
      try {
        const saved = localStorage.getItem(`codearena_user_code_${pKey}_${language}`);
        if (saved !== null && saved.trim() !== '') initialCode = saved;
      } catch (e) {}

      if (!initialCode) {
        initialCode = (q.starterCode && q.starterCode[language]) || getDefaultBoilerplate(language);
      }
      setCode(initialCode);
    } catch (err) {
      console.error('Error fetching question:', err);
      setError('Failed to load question details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissionHistory = async () => {
    try {
      if (!user) return;
      const res = await api.get('/submissions', {
        params: { questionId: question?._id || problemSlug }
      });
      setPastSubmissions(res.data.submissions || []);
    } catch (err) {
      console.warn('Could not fetch past submissions:', err);
    }
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    const pKey = question?._id || question?.slug || problemSlug;
    let initialCode = '';
    if (pKey) {
      try {
        const saved = localStorage.getItem(`codearena_user_code_${pKey}_${newLang}`);
        if (saved !== null && saved.trim() !== '') initialCode = saved;
      } catch (e) {}
    }
    if (!initialCode) {
      initialCode = (question && question.starterCode && question.starterCode[newLang]) || getDefaultBoilerplate(newLang);
    }
    setCode(initialCode);
  };

  const handleCodeChange = (val) => {
    const newCode = val || '';
    setCode(newCode);
    const pKey = question?._id || question?.slug || problemSlug;
    if (pKey) {
      try {
        localStorage.setItem(`codearena_user_code_${pKey}_${language}`, newCode);
      } catch (e) {}
    }
  };

  const getDefaultBoilerplate = (lang) => {
    switch (lang) {
      case 'python':
        return `# Write code here\ndef solve():\n    pass\n\nsolve()\n`;
      case 'cpp':
        return `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write code here\n    return 0;\n}\n`;
      case 'c':
        return `#include <stdio.h>\n\nint main() {\n    // Write code here\n    return 0;\n}\n`;
      case 'java':
        return `public class Solution {\n    public static void main(String[] args) {\n        // Write code here\n    }\n}\n`;
      case 'javascript':
        return `// Write code here\nfunction solve() {\n}\nsolve();\n`;
      default:
        return '';
    }
  };

  const handleRunCode = async () => {
    try {
      setExecuting(true);
      setRunResults(null);
      setSubmissionResult(null);
      setBottomPanelTab('results');

      const payload = {
        language,
        code,
        questionId: question?._id || question?.id || problemSlug,
        customInput: customInput || null
      };

      const res = await api.post('/submissions/run', payload);
      setRunResults(res.data);
    } catch (err) {
      setRunResults({
        status: 'Error',
        error: err.response?.data?.message || 'Execution request failed'
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleSubmitCode = async () => {
    try {
      setSubmitting(true);
      setSubmissionResult(null);
      setRunResults(null);
      setBottomPanelTab('results');

      const payload = {
        language,
        code,
        questionId: question?._id || question?.id || problemSlug
      };

      const res = await api.post('/submissions/submit', payload);
      const sub = res.data.submission || res.data;
      setSubmissionResult({
        status: sub.verdict || sub.status || 'Evaluated',
        passCount: sub.testCasesPassed !== undefined ? sub.testCasesPassed : (sub.passCount || 0),
        totalCount: sub.totalTestCases !== undefined ? sub.totalTestCases : (sub.totalCount || 0),
        executionTime: sub.executionTime || 0,
        memoryUsed: sub.memoryUsed || 0,
        error: sub.error || null,
        details: sub.details || []
      });
      fetchSubmissionHistory();
    } catch (err) {
      setSubmissionResult({
        status: 'Submission Failed',
        error: err.response?.data?.message || 'Submission request failed'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getDiffColor = (diff) => {
    switch (diff) {
      case 'Easy': return 'var(--diff-easy)';
      case 'Medium': return 'var(--diff-medium)';
      case 'Hard': return 'var(--diff-hard)';
      default: return 'var(--text-slate)';
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-slate)' }}>
        Loading Problem Workbench...
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="card" style={{ color: 'var(--diff-hard)' }}>{error || 'Question not found.'}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-paper)' }}>
      
      {/* Top Action Bar */}
      <div style={{
        padding: '0.5rem 1rem',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={onBack}>
            <ArrowLeft size={14} /> Back
          </button>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{question.title}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Language Selector */}
          <select
            className="form-select"
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            style={{ width: '130px', padding: '0.25rem 0.5rem', fontSize: '0.82rem' }}
          >
            <option value="python">Python 3</option>
            <option value="cpp">C++ (g++)</option>
            <option value="c">C (gcc)</option>
            <option value="java">Java</option>
            <option value="javascript">JavaScript</option>
          </select>

          <button
            className="btn btn-primary btn-sm"
            onClick={handleRunCode}
            disabled={executing || submitting}
          >
            <Play size={13} /> {executing ? 'Running...' : 'Run'}
          </button>

          <button
            className="btn btn-outline btn-sm"
            onClick={handleSubmitCode}
            disabled={executing || submitting}
          >
            <Send size={13} /> {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>

      {/* Main Split Workbench Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Pane — Problem Statement & Details */}
        <div style={{
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Left Pane Header Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-paper)'
          }}>
            <button
              onClick={() => setActiveTab('problem')}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                fontWeight: activeTab === 'problem' ? 600 : 500,
                color: activeTab === 'problem' ? 'var(--accent-blue)' : 'var(--text-slate)',
                border: 'none',
                background: activeTab === 'problem' ? 'var(--bg-surface)' : 'transparent',
                borderBottom: activeTab === 'problem' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                cursor: 'pointer'
              }}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                fontWeight: activeTab === 'submissions' ? 600 : 500,
                color: activeTab === 'submissions' ? 'var(--accent-blue)' : 'var(--text-slate)',
                border: 'none',
                background: activeTab === 'submissions' ? 'var(--bg-surface)' : 'transparent',
                borderBottom: activeTab === 'submissions' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                cursor: 'pointer'
              }}
            >
              Submissions ({pastSubmissions.length})
            </button>
          </div>

          {/* Left Pane Content Body */}
          <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto' }}>
            {activeTab === 'problem' ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{question.title}</h3>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: getDiffColor(question.difficulty) }}>
                    {question.difficulty}
                  </span>
                  {question.points && (
                    <span className="badge badge-passed" style={{ fontSize: '0.75rem' }}>
                      {question.points} pts
                    </span>
                  )}
                </div>

                {/* Topic Tags */}
                {question.tags && question.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {question.tags.map(t => (
                      <span key={t} style={{ background: 'var(--bg-paper)', border: '1px solid var(--border-color)', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <p style={{ color: 'var(--text-slate)', lineHeight: 1.6, marginBottom: '1.25rem', whiteSpace: 'pre-line' }}>
                  {question.description}
                </p>

                {/* Input Format */}
                {question.inputFormat && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.3rem' }}>Input Format</h4>
                    <p style={{ color: 'var(--text-slate)', fontSize: '0.85rem', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                      {question.inputFormat}
                    </p>
                  </div>
                )}

                {/* Output Format */}
                {question.outputFormat && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.3rem' }}>Output Format</h4>
                    <p style={{ color: 'var(--text-slate)', fontSize: '0.85rem', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                      {question.outputFormat}
                    </p>
                  </div>
                )}

                {/* Sample Test Cases */}
                {question.sampleTestCases && question.sampleTestCases.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Sample Test Cases</h4>
                    {question.sampleTestCases.map((tc, idx) => (
                      <div key={idx} style={{
                        background: 'var(--bg-paper)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        fontSize: '0.85rem'
                      }}>
                        <div style={{ marginBottom: '0.35rem' }}>
                          <span style={{ color: 'var(--text-slate)', fontSize: '0.78rem' }}>Input:</span>
                          <pre className="font-mono" style={{ background: 'var(--bg-surface)', padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border-color)', marginTop: '0.2rem' }}>{tc.input}</pre>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-slate)', fontSize: '0.78rem' }}>Output:</span>
                          <pre className="font-mono" style={{ background: 'var(--bg-surface)', padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border-color)', marginTop: '0.2rem' }}>{tc.expectedOutput || tc.output}</pre>
                        </div>
                        {tc.explanation && (
                          <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-slate)' }}>
                            <em>Explanation: {tc.explanation}</em>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Constraints in Plex Mono */}
                {question.constraints && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Constraints</h4>
                    <div className="font-mono" style={{
                      background: 'var(--bg-paper)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.65rem 0.85rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-ink)',
                      whiteSpace: 'pre-line'
                    }}>
                      {Array.isArray(question.constraints) ? question.constraints.join('\n') : question.constraints}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Your Past Submissions</h4>
                {pastSubmissions.length === 0 ? (
                  <p style={{ color: 'var(--text-slate)', fontSize: '0.88rem' }}>No past submissions for this problem yet.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Lang</th>
                        <th>Runtime</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastSubmissions.map((sub, idx) => {
                        const statusText = sub.verdict || sub.status || 'Evaluated';
                        const isAccepted = statusText === 'Accepted' || statusText === 'Passed';
                        return (
                          <tr key={sub._id || idx}>
                            <td style={{ fontWeight: 600, color: isAccepted ? 'var(--diff-easy)' : 'var(--diff-hard)' }}>
                              {statusText}
                            </td>
                            <td className="font-mono" style={{ fontSize: '0.8rem' }}>{sub.language}</td>
                            <td className="font-mono" style={{ fontSize: '0.8rem' }}>{sub.executionTime || '0'}ms</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-slate)' }}>
                              {new Date(sub.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane — Monaco Editor (Light Theme) & Console Drawer */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Monaco Code Editor (Light Theme vs) */}
          <div style={{ flex: 1, minHeight: '300px' }}>
            <Editor
              height="100%"
              language={language === 'cpp' || language === 'c' ? 'cpp' : language}
              theme="vs"
              value={code}
              onChange={handleCodeChange}
              options={{
                fontSize: 13,
                fontFamily: "'IBM Plex Mono', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbersMinChars: 3,
                automaticLayout: true,
                tabSize: 4
              }}
            />
          </div>

          {/* Console Drawer — Monospace Plain Data Row Format */}
          <div style={{
            height: '180px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-surface)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: '0.35rem 0.85rem',
              background: 'var(--bg-paper)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              color: 'var(--text-slate)'
            }}>
              <span style={{ fontWeight: 600 }}>Test &amp; Execution Output</span>
              <span>Monospace Output Table</span>
            </div>

            {/* Drawer Output Body */}
            <div style={{ flex: 1, padding: '0.65rem 0.85rem', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
              {executing || submitting ? (
                <div style={{ color: 'var(--accent-blue)' }}>Executing submission inside sandbox queue...</div>
              ) : submissionResult ? (
                <div>
                  {/* 1. Compile or Runtime Error Diagnostic Banner */}
                  {(submissionResult?.error ||
                    (submissionResult?.details && submissionResult.details.some(d => d.status === 'Compile Error' || (d.stderr && d.stderr.trim().length > 0)))) && (
                    <CompileErrorDisplay
                      error={
                        submissionResult.error ||
                        submissionResult.details?.find(d => d.status === 'Compile Error')?.stderr ||
                        submissionResult.details?.find(d => d.stderr)?.stderr
                      }
                      language={language}
                      title={submissionResult.status === 'Compile Error' ? 'Compilation Error' : 'Runtime Diagnostics'}
                    />
                  )}

                  {/* 2. Verdict details (if not compile error) */}
                  {submissionResult.status !== 'Compile Error' && (
                    <table className="data-table" style={{ border: 'none', width: '100%', marginBottom: '0.5rem' }}>
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Passed</th>
                          <th>Runtime</th>
                          <th>Memory</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 600, color: submissionResult.status === 'Accepted' ? 'var(--diff-easy)' : 'var(--diff-hard)' }}>
                            {submissionResult.status}
                          </td>
                          <td>{submissionResult.passCount} / {submissionResult.totalCount}</td>
                          <td>{submissionResult.executionTime || 0}ms</td>
                          <td>{submissionResult.memoryUsed || 0} KB</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              ) : runResults ? (
                <div>
                  {/* Compile Error in Dry Run */}
                  {(runResults.compileError ||
                    runResults.error ||
                    (runResults.testResults && runResults.testResults.some(t => t.status === 'Compile Error' || (t.stderr && t.stderr.trim().length > 0)))) && (
                    <CompileErrorDisplay
                      error={
                        runResults.compileError ||
                        runResults.error ||
                        runResults.testResults?.find(t => t.status === 'Compile Error')?.stderr ||
                        runResults.testResults?.find(t => t.stderr)?.stderr ||
                        runResults.stderr
                      }
                      language={language}
                      title={
                        runResults.status === 'Compile Error' || (runResults.testResults && runResults.testResults.some(t => t.status === 'Compile Error'))
                          ? 'Compilation Error'
                          : 'Runtime Diagnostics'
                      }
                    />
                  )}

                  {/* Sample Test Results Table */}
                  {runResults.testResults && runResults.testResults.length > 0 && !runResults.testResults.every(t => t.status === 'Compile Error') && (
                    <div>
                      <table className="data-table" style={{ border: 'none', marginBottom: '0.6rem', width: '100%' }}>
                        <thead>
                          <tr>
                            <th>Case</th>
                            <th>Status</th>
                            <th>Actual Output</th>
                            <th>Expected Output</th>
                            <th>Runtime</th>
                          </tr>
                        </thead>
                        <tbody>
                          {runResults.testResults.map((tc, i) => (
                            <tr key={i}>
                              <td>#{tc.testCaseIndex || i + 1}</td>
                              <td style={{ fontWeight: 600, color: tc.status === 'Passed' ? 'var(--diff-easy)' : 'var(--diff-hard)' }}>
                                {tc.status}
                              </td>
                              <td className="font-mono" style={{ fontSize: '0.8rem' }}>{tc.actualOutput || tc.stdout || '(empty)'}</td>
                              <td className="font-mono" style={{ fontSize: '0.8rem' }}>{tc.expectedOutput}</td>
                              <td className="font-mono" style={{ fontSize: '0.8rem' }}>{tc.executionTime || 0}ms</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Custom Execution Output */}
                  {runResults.customExecution && (
                    <div style={{ marginTop: '0.4rem' }}>
                      <table className="data-table" style={{ border: 'none', width: '100%' }}>
                        <thead>
                          <tr>
                            <th>Execution Status</th>
                            <th>Runtime</th>
                            <th>Memory</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: 600, color: runResults.status === 'Accepted' || runResults.status === 'Passed' ? 'var(--diff-easy)' : 'var(--diff-hard)' }}>
                              {runResults.status}
                            </td>
                            <td>{runResults.executionTime || 0}ms</td>
                            <td>{runResults.memory || 0} KB</td>
                          </tr>
                        </tbody>
                      </table>
                      {runResults.stdout && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <span style={{ color: 'var(--text-slate)', fontSize: '0.75rem', fontWeight: 600 }}>Standard Output:</span>
                          <pre style={{ background: 'var(--bg-paper)', padding: '0.4rem', borderRadius: '4px', marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{runResults.stdout}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>
                  Click [Run] to test sample cases, or [Submit] to evaluate against hidden test cases.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
