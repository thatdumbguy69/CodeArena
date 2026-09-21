import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { ShieldAlert, Clock, AlertTriangle, Play, Send, Award, ArrowRight, ChevronLeft, ChevronRight, CheckCircle, XCircle, Lock, Maximize } from 'lucide-react';
import { CompileErrorDisplay } from '../components/common/CompileErrorDisplay';

export const ContestMode = ({ contest, onFinishContest, onBack }) => {
  const { user } = useAuth();
  const handleExit = onFinishContest || onBack || (() => window.location.reload());

  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(contest?.remainingSecs ?? ((contest?.duration || 60) * 60));
  const [contestFinished, setContestFinished] = useState(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);

  const [language, setLanguage] = useState('python');
  const [codes, setCodes] = useState({});
  const [executing, setExecuting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [disqualifiedReason, setDisqualifiedReason] = useState(null);
  const [reinstatedModalOpen, setReinstatedModalOpen] = useState(false);
  const [reinstatedCountdown, setReinstatedCountdown] = useState(20);
  const reinstatedTimerRef = useRef(null);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(15);
  const warningTimerRef = useRef(null);
  
  const [runResults, setRunResults] = useState({});
  const [verdicts, setVerdicts] = useState({});
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(false);

  // Anti-cheat state
  const [blurCount, setBlurCount] = useState(0);
  const [securityAlert, setSecurityAlert] = useState(null);

  // 15-Second Contest Onboarding Instructions Overlay
  const [showInstructionsModal, setShowInstructionsModal] = useState(true);
  const [instructionsCountdown, setInstructionsCountdown] = useState(15);

  // Non-blinking Finish Contest Tooltip Hover State
  const [hoveringFinish, setHoveringFinish] = useState(false);

  // Real-Time Left-Side Host Timer Adjustment Toast
  const [timerToast, setTimerToast] = useState(null);

  // Fresh State Refs for Timer End Auto-Submit Callback
  const codesRef = useRef(codes);
  const questionsRef = useRef(questions);
  const verdictsRef = useRef(verdicts);
  const languageRef = useRef(language);
  const blurCountRef = useRef(blurCount);

  useEffect(() => { codesRef.current = codes; }, [codes]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { verdictsRef.current = verdicts; }, [verdicts]);
  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { blurCountRef.current = blurCount; }, [blurCount]);

  const getDefaultStarterCode = (lang) => {
    switch (lang) {
      case 'python':
        return `import sys\n\ndef main():\n    # Read input from STDIN and print output to STDOUT\n    input_data = sys.stdin.read().strip()\n    if not input_data:\n        return\n    # Write logic here\n\nif __name__ == '__main__':\n    main()\n`;
      case 'cpp':
        return `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Read input from STDIN and print output to STDOUT\n    return 0;\n}\n`;
      case 'c':
        return `#include <stdio.h>\n\nint main() {\n    // Read input from STDIN and print output to STDOUT\n    return 0;\n}\n`;
      case 'java':
        return `import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Read input from STDIN and print output to STDOUT\n    }\n}\n`;
      case 'javascript':
        return `const fs = require('fs');\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim();\n    // Write logic here\n}\n\nmain();\n`;
      default:
        return '';
    }
  };

  const autoSubmitAndFinish = async () => {
    if (contestFinished || isAutoSubmitting) return;
    setIsAutoSubmitting(true);

    const qList = questionsRef.current || [];
    const currentCodes = codesRef.current || {};
    const currentVerdicts = { ...verdictsRef.current };
    const lang = languageRef.current || 'python';
    const blurs = blurCountRef.current || 0;

    // Automatically submit code for every problem with non-empty code
    for (const q of qList) {
      const qId = q._id || q.slug;
      const userCode = currentCodes[qId];

      if (userCode && userCode.trim().length > 0) {
        try {
          const res = await api.post('/submissions/submit', {
            questionId: q._id || q.id || q.slug,
            language: lang,
            code: userCode,
            antiCheatLogs: [{ event: `Auto-Submitted on Contest Time Completion with ${blurs} tab blurs`, timestamp: new Date() }],
            contestId: contest?._id || contest?.slug,
            blurCount: blurs
          });

          if (res.data && res.data.submission) {
            currentVerdicts[qId] = res.data.submission;
          }
        } catch (err) {
          console.error(`Auto-submission error for problem ${q.title}:`, err);
        }
      }
    }

    setVerdicts(currentVerdicts);

    try {
      if (contest) {
        await api.post(`/contests/${contest._id || contest.slug}/session/finish`);
      }
    } catch (e) {
      console.error('Failed to mark contest session as finished on backend', e);
    }

    setIsAutoSubmitting(false);
    setContestFinished(true);
  };

  const [contestData, setContestData] = useState(contest);
  const [startsInSecs, setStartsInSecs] = useState(0);

  const fetchContestDetails = async () => {
    if (!contest) return;
    try {
      const res = await api.get(`/contests/${contest._id || contest.slug}`);
      const serverContest = res.data.contest;
      if (serverContest) {
        setContestData(serverContest);
        const qList = serverContest.problems || [];
        setQuestions(qList);

        // Wall clock sync calculation
        const now = new Date();
        const start = serverContest.startTime ? new Date(serverContest.startTime) : now;
        const end = serverContest.endTime ? new Date(serverContest.endTime) : new Date(now.getTime() + (serverContest.duration || 60) * 60000);

        if (now < start) {
          setStartsInSecs(Math.max(0, Math.floor((start.getTime() - now.getTime()) / 1000)));
        } else {
          setStartsInSecs(0);
          const remaining = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
          setTimeLeft(remaining);

          if ((remaining <= 0 || serverContest.status === 'Ended') && !contestFinished && !isAutoSubmitting) {
            autoSubmitAndFinish();
          }
        }

        setCodes(prev => {
          if (Object.keys(prev).length > 0) return prev;
          const initialCodes = {};
          qList.forEach(q => {
            const qId = q._id || q.slug;
            const qCode = q.starterCode && q.starterCode[language];
            initialCodes[qId] = qCode || getDefaultStarterCode(language);
          });
          return initialCodes;
        });
      }
    } catch (err) {
      console.error('Error fetching contest questions:', err);
    }
  };

  const { socket, joinContest, emitBlurEvent } = useSocket();

  const maxAllowedBlurs = contestData?.maxAllowedBlurs !== undefined 
    ? Math.max(1, parseInt(contestData.maxAllowedBlurs, 10) || 2)
    : (contest?.maxAllowedBlurs !== undefined ? Math.max(1, parseInt(contest.maxAllowedBlurs, 10) || 2) : 2);

  // 15-Second Contest Onboarding Instructions Countdown
  useEffect(() => {
    if (!showInstructionsModal) return;
    const timer = setInterval(() => {
      setInstructionsCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowInstructionsModal(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showInstructionsModal]);

  // Real-time WebSocket connection to contest room & force end listener
  useEffect(() => {
    if (!contest) return;
    const cId = contest._id || contest.slug || contest.id;
    if (joinContest && cId) {
      joinContest(cId, {
        userId: user?._id || user?.id,
        userName: user?.name,
        email: user?.email
      });
    }

    if (!socket) return;

    const handleForceSubmit = (data) => {
      console.log('⚡ Admin force ended the contest! Submitting solutions immediately...', data);
      setSecurityAlert('🛑 Contest has been finalized and ended by Host Administrator.');
      autoSubmitAndFinish();
    };

    const handleTimerSync = (data) => {
      if (data && typeof data.remainingSecs === 'number') {
        console.log('⚡ Received timer sync from admin:', data.remainingSecs);
        setTimeLeft(data.remainingSecs);
        
        const extra = data.extraMinutes;
        const msg = extra > 0 
          ? `⏳ Contest Time Extended: +${extra} minutes added by Host Admin!`
          : (extra < 0 ? `⏳ Contest Time Reduced: ${Math.abs(extra)} minutes adjusted by Host Admin!` : `⏳ Contest Timer Synchronized by Host Admin.`);
        
        setTimerToast({ id: Date.now(), message: msg });
        setTimeout(() => setTimerToast(null), 6000);

        if (data.remainingSecs <= 0) {
          autoSubmitAndFinish();
        }
      }
    };

    const handleDisqualified = (data) => {
      setContestFinished(true);
      setDisqualifiedReason(data?.reason || 'You have been disqualified by the contest administrator.');
    };

    const handleQualified = (data) => {
      if (data?.userId && user && String(data.userId) !== String(user._id || user.id)) {
        return;
      }
      setContestFinished(false);
      setDisqualifiedReason(null);
      setBlurCount(0);
      setReinstatedCountdown(20);
      setReinstatedModalOpen(true);

      if (reinstatedTimerRef.current) clearInterval(reinstatedTimerRef.current);
      reinstatedTimerRef.current = setInterval(() => {
        setReinstatedCountdown(prev => {
          if (prev <= 1) {
            clearInterval(reinstatedTimerRef.current);
            setReinstatedModalOpen(false);
            setSecurityAlert('✅ Second chance active: Contest resumed! Do not switch tabs or windows.');
            setTimeout(() => setSecurityAlert(null), 6000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    socket.on('contest:force_submit', handleForceSubmit);
    socket.on('contest:timer_sync', handleTimerSync);
    socket.on('user:disqualified', handleDisqualified);
    socket.on('user:qualified', handleQualified);

    return () => {
      socket.off('contest:force_submit', handleForceSubmit);
      socket.off('contest:timer_sync', handleTimerSync);
      socket.off('user:disqualified', handleDisqualified);
      socket.off('user:qualified', handleQualified);
      if (reinstatedTimerRef.current) clearInterval(reinstatedTimerRef.current);
    };
  }, [socket, contest?._id, contest?.slug, user?._id]);

  useEffect(() => {
    fetchContestDetails();

    // 5-second Sync Polling with Server
    const syncInterval = setInterval(() => {
      fetchContestDetails();
    }, 5000);

    // 1-second Countdown Interval
    const timer = setInterval(() => {
      setStartsInSecs(prevStarts => {
        if (prevStarts > 1) return prevStarts - 1;
        if (prevStarts === 1) {
          fetchContestDetails();
          return 0;
        }
        return 0;
      });

      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          autoSubmitAndFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Window Blur Anti-Cheat
    const handleBlur = () => {
      if (contestFinished || isAutoSubmitting) return;
      if (contest && contest.antiCheatEnabled === false) return;
      const nextCount = blurCount + 1;
      const maxAllowed = maxAllowedBlurs;

      setBlurCount(nextCount);

      if (emitBlurEvent) {
        emitBlurEvent({
          contestId: contest?._id || contest?.slug || contest?.id,
          userId: user?._id || user?.id,
          userName: user?.name,
          teamName: user?.teamName || user?.name,
          email: user?.email,
          blurCount: nextCount,
          maxAllowedBlurs: maxAllowed,
          isDisqualified: nextCount >= maxAllowed,
          event: `Tab Switch / Focus Lost (${nextCount}/${maxAllowed})`
        });
      }

      if (nextCount < maxAllowed) {
        setWarningModalOpen(true);
        setWarningCountdown(15);
        if (warningTimerRef.current) clearInterval(warningTimerRef.current);
        warningTimerRef.current = setInterval(() => {
          setWarningCountdown(prev => {
            if (prev <= 1) {
              clearInterval(warningTimerRef.current);
              setWarningModalOpen(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        setSecurityAlert(`SECURITY WARNING: Focus lost / tab switch detected (${nextCount}/${maxAllowed})! Next violation will result in disqualification.`);
      } else {
        if (warningTimerRef.current) clearInterval(warningTimerRef.current);
        setWarningModalOpen(false);
        setContestFinished(true);
        setDisqualifiedReason(`Disqualified for exceeding maximum focus loss violations (${nextCount}/${maxAllowed}).`);
        autoSubmitAndFinish();
      }
    };

    window.addEventListener('blur', handleBlur);

    return () => {
      clearInterval(syncInterval);
      clearInterval(timer);
      window.removeEventListener('blur', handleBlur);
      if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    };
  }, [blurCount, contestFinished, contest, maxAllowedBlurs]);

  const activeQuestion = questions[currentIdx];

  const handleCodeChange = (val) => {
    if (!activeQuestion || contestFinished || isAutoSubmitting) return;
    setCodes({
      ...codes,
      [activeQuestion._id || activeQuestion.slug]: val || ''
    });
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (!activeQuestion) return;
    const qId = activeQuestion._id || activeQuestion.slug;
    const qCode = activeQuestion.starterCode && activeQuestion.starterCode[newLang];
    setCodes({
      ...codes,
      [qId]: qCode || getDefaultStarterCode(newLang)
    });
  };

  const handleRunCode = async () => {
    if (!activeQuestion || contestFinished || isAutoSubmitting) return;
    try {
      setExecuting(true);
      setIsConsoleExpanded(true);
      const qId = activeQuestion._id || activeQuestion.slug;
      const currentCode = codes[qId] || '';

      const res = await api.post('/submissions/run', {
        questionId: activeQuestion._id || activeQuestion.id || activeQuestion.slug,
        language,
        code: currentCode
      });
      setRunResults({
        ...runResults,
        [qId]: res.data
      });
    } catch (err) {
      console.error('Run code error:', err);
      const qId = activeQuestion._id || activeQuestion.slug;
      setRunResults({
        ...runResults,
        [qId]: { error: err.response?.data?.message || 'Error executing code' }
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!activeQuestion || contestFinished || isAutoSubmitting) return;
    try {
      setSubmitting(true);
      setIsConsoleExpanded(true);
      const qId = activeQuestion._id || activeQuestion.slug;
      const currentCode = codes[qId] || '';

      const res = await api.post('/submissions/submit', {
        questionId: activeQuestion._id || activeQuestion.id || activeQuestion.slug,
        language,
        code: currentCode,
        antiCheatLogs: [{ event: `Contest Submission with ${blurCount} tab blurs`, timestamp: new Date() }],
        contestId: contest?._id || contest?.slug,
        blurCount: blurCount
      });

      setVerdicts({
        ...verdicts,
        [qId]: {
          ...res.data.submission,
          compileError: res.data.compileError,
          stderr: res.data.stderr
        }
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting solution');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (startsInSecs > 0 && !contestFinished) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '620px', margin: '0 auto', padding: '3rem 2.5rem', borderRadius: '16px' }}>
          <div style={{
            display: 'inline-flex',
            padding: '1rem',
            borderRadius: '50%',
            background: '#FEF3C7',
            color: '#D97706',
            marginBottom: '1.25rem'
          }}>
            <Clock size={48} />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <span style={{
              background: '#FEF3C7',
              color: '#B45309',
              border: '1px solid #FCD34D',
              padding: '0.3rem 0.8rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 800,
              textTransform: 'uppercase'
            }}>
              ⏳ Contest Waiting Room
            </span>
          </div>

          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-ink)', marginBottom: '0.5rem' }}>
            {contestData?.title || contest?.title || 'Competitive Assessment'}
          </h2>

          <p style={{ color: 'var(--text-slate)', fontSize: '0.92rem', marginBottom: '2rem' }}>
            {contestData?.description || contest?.description || 'This contest has not started yet. Problem statements and the code editor will unlock automatically once the start time is reached.'}
          </p>

          <div style={{
            background: 'var(--bg-paper)',
            border: '2px dashed #FCD34D',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '0.4rem' }}>
              Contest Starts In
            </span>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              fontFamily: 'IBM Plex Mono, monospace',
              color: '#D97706',
              letterSpacing: '2px'
            }}>
              {formatTime(startsInSecs)}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'left', background: 'var(--bg-paper)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.82rem' }}>
            <div>
              <span style={{ color: 'var(--text-slate)', display: 'block' }}>Start Time:</span>
              <strong style={{ color: 'var(--text-ink)' }}>{contestData?.startTime ? new Date(contestData.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Scheduled Soon'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-slate)', display: 'block' }}>Test Duration:</span>
              <strong style={{ color: 'var(--text-ink)' }}>{contestData?.duration || contest?.duration || 60} minutes</strong>
            </div>
          </div>

          <button className="btn btn-secondary" onClick={handleExit} style={{ width: '100%' }}>
            Return to Main Arena
          </button>
        </div>
      </div>
    );
  }

  if (isAutoSubmitting) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '560px', margin: '0 auto', padding: '3rem 2rem' }}>
          <Clock size={48} color="var(--accent-blue)" style={{ marginBottom: '1.25rem', animation: 'pulse 1.5s infinite' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.6rem', color: 'var(--text-ink)' }}>
            Contest Timings Completed!
          </h2>
          <p style={{ color: 'var(--text-slate)', fontSize: '0.92rem', lineHeight: 1.6 }}>
            The contest time limit has expired. Automatically submitting all your written code solutions to the evaluation engine...
          </p>
        </div>
      </div>
    );
  }

  if (contestFinished) {
    return (
      <div className="container" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '650px', margin: '0 auto', padding: '2.5rem' }}>
          <Award size={52} color="var(--accent-blue)" style={{ marginBottom: '1rem' }} />

          <div style={{ marginBottom: '1rem' }}>
            <span className="badge badge-hard" style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={15} /> Contest Timings Completed
            </span>
          </div>

          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.6rem', color: 'var(--text-ink)' }}>
            Contest Timings Completed
          </h1>
          <p style={{ color: 'var(--text-slate)', marginBottom: '1.75rem', fontSize: '0.92rem', lineHeight: 1.5 }}>
            {disqualifiedReason ? disqualifiedReason : 'The contest timings are completed. All of your written solutions have been automatically submitted and evaluated.'}
          </p>

          <div style={{
            background: 'var(--bg-paper)',
            border: '1px solid var(--border-color)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '2rem',
            textAlign: 'left',
            fontSize: '0.88rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-slate)', fontWeight: 600 }}>Contest Title:</span>
              <span style={{ fontWeight: 700, color: 'var(--text-ink)' }}>{contest?.title || 'Timed Contest'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-slate)' }}>Anti-Cheat Security Flags:</span>
              <span className={`badge ${blurCount === 0 ? 'badge-passed' : 'badge-wrong'}`}>
                {blurCount} Tab Blurs Logged
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--text-slate)' }}>Total Problems Evaluated:</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>
                {Object.keys(verdicts).length} / {questions.length} Submitted
              </span>
            </div>

            {questions.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-slate)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Submission Summary
                </div>
                <table className="data-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Problem Title</th>
                      <th>Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q, idx) => {
                      const qId = q._id || q.slug;
                      const v = verdicts[qId];
                      return (
                        <tr key={qId}>
                          <td>Q{idx + 1}</td>
                          <td style={{ fontWeight: 600 }}>{q.title}</td>
                          <td>
                            {v ? (
                              <span className={`badge ${v.verdict === 'Accepted' || v.verdict === 'Passed' ? 'badge-passed' : 'badge-hard'}`}>
                                {v.verdict}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-slate)', fontStyle: 'italic' }}>Not Submitted</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <button className="btn btn-primary" onClick={handleExit}>
            Return to Main Arena <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-paper)', overflow: 'hidden' }}>
      {/* Top Banner Header with Countdown Timer & Security Alert */}
      <div style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.6rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-ink)' }}>
            Contest: {contest?.title || 'Timed Assessment'}
          </span>
          <span style={{
            background: timeLeft <= 60 ? 'rgba(255, 82, 82, 0.1)' : 'var(--bg-paper)',
            border: timeLeft <= 60 ? '1px solid #ff5252' : '1px solid var(--border-color)',
            padding: '0.3rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: timeLeft <= 60 ? '#ff5252' : 'var(--accent-blue)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <Clock size={14} /> {timeLeft <= 0 ? 'Contest Timings Completed' : formatTime(timeLeft)}
          </span>
        </div>

        {/* Mini Visible Circular Figure for Attempted Violations & Security Warning Alert */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            title={`Proctoring Violations: ${blurCount} of ${maxAllowedBlurs} max`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.25rem 0.6rem',
              borderRadius: '20px',
              background: blurCount === 0 ? '#F0FDF4' : (blurCount < maxAllowedBlurs ? '#FEF3C7' : '#FEE2E2'),
              border: `1.5px solid ${blurCount === 0 ? '#86EFAC' : (blurCount < maxAllowedBlurs ? '#FCD34D' : '#FCA5A5')}`,
              boxShadow: blurCount > 0 ? '0 0 10px rgba(220, 38, 38, 0.25)' : 'none',
              userSelect: 'none'
            }}
          >
            <div style={{ position: 'relative', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="26" height="26" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="13"
                  cy="13"
                  r="10"
                  fill="transparent"
                  stroke={blurCount === 0 ? '#DCFCE7' : (blurCount < maxAllowedBlurs ? '#FDE68A' : '#FECACA')}
                  strokeWidth="3"
                />
                <circle
                  cx="13"
                  cy="13"
                  r="10"
                  fill="transparent"
                  stroke={blurCount === 0 ? '#16A34A' : (blurCount < maxAllowedBlurs ? '#D97706' : '#DC2626')}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 10}
                  strokeDashoffset={2 * Math.PI * 10 * (1 - Math.min(blurCount, maxAllowedBlurs) / maxAllowedBlurs)}
                  style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                />
              </svg>
              <span style={{
                position: 'absolute',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '0.7rem',
                fontWeight: 900,
                color: blurCount === 0 ? '#16A34A' : (blurCount < maxAllowedBlurs ? '#D97706' : '#DC2626')
              }}>
                {blurCount}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: blurCount === 0 ? '#15803D' : (blurCount < maxAllowedBlurs ? '#B45309' : '#B91C1C'),
                textTransform: 'uppercase',
                letterSpacing: '0.03em'
              }}>
                {blurCount === 0 ? `0/${maxAllowedBlurs} Blurs` : `${blurCount}/${maxAllowedBlurs} Blurs`}
              </span>
              <span style={{ fontSize: '0.6rem', color: blurCount === 0 ? '#166534' : (blurCount < maxAllowedBlurs ? `${blurCount} Warning` : 'Lockout') }}>
                {blurCount === 0 ? 'Clear' : (blurCount < maxAllowedBlurs ? `${blurCount} Warning` : 'Lockout')}
              </span>
            </div>
          </div>

          {securityAlert && (
            <div style={{
              background: 'rgba(255, 82, 82, 0.1)',
              border: '1px solid #ff5252',
              color: '#ff5252',
              padding: '0.3rem 0.8rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              animation: 'pulse 1s infinite'
            }}>
              <AlertTriangle size={14} /> {securityAlert}
            </div>
          )}
        </div>

        {(() => {
          const canFinishContest = timeLeft <= 15 * 60;
          return (
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => setHoveringFinish(true)}
              onMouseLeave={() => setHoveringFinish(false)}
            >
              <button
                className={`btn btn-sm ${canFinishContest ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => {
                  if (!canFinishContest) {
                    const rem = Math.max(0, timeLeft - 900);
                    alert(`⏳ Finish Contest is Locked\n\nPer contest rules, this button only activates during the final 15 minutes before the contest ends.\n\nContest Time Remaining: ${formatTime(timeLeft)}\nUnlocks in: ${formatTime(rem)}`);
                    return;
                  }
                  if (window.confirm("Are you sure you want to finish and submit the contest now?\n\nAll current solutions will be submitted and your contest session will be marked as completed.")) {
                    autoSubmitAndFinish();
                  }
                }}
                disabled={isAutoSubmitting}
                style={{
                  fontWeight: 700,
                  cursor: canFinishContest ? 'pointer' : 'not-allowed',
                  opacity: canFinishContest ? 1 : 0.65,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: canFinishContest ? '#DC2626' : '#F1F5F9',
                  color: canFinishContest ? '#FFFFFF' : '#64748B',
                  border: canFinishContest ? '1px solid #DC2626' : '1px solid #CBD5E1'
                }}
              >
                {canFinishContest ? <CheckCircle size={14} /> : <Lock size={13} />}
                <span>Finish Contest</span>
                {!canFinishContest && <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>(Locked &gt;15m)</span>}
              </button>

              {/* Stable Non-Blinking Hover Tooltip */}
              {hoveringFinish && !canFinishContest && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: '#0F172A',
                  color: '#F8FAFC',
                  padding: '0.55rem 0.9rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.35)',
                  zIndex: 9999,
                  pointerEvents: 'none',
                  border: '1px solid #334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}>
                  <Lock size={12} style={{ color: '#F59E0B' }} />
                  <span>Unlocks during final 15 mins (in <strong style={{ color: '#FCD34D', fontFamily: 'IBM Plex Mono, monospace' }}>{formatTime(Math.max(0, timeLeft - 900))}</strong>)</span>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Main Contest Split Grid */}
      {activeQuestion ? (
        <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          
          {/* Left Column: Problem Switcher & Problem Statement */}
          <div style={{ borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', minHeight: 0, overflow: 'hidden' }}>
            
            {/* Question Selector Tabs & Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-paper)', borderBottom: '1px solid var(--border-color)', padding: '0.4rem 0.6rem', gap: '0.4rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}
                title="Previous Question"
              >
                <ChevronLeft size={14} /> Prev
              </button>

              <div style={{ display: 'flex', gap: '0.3rem', flex: 1, overflowX: 'auto' }}>
                {questions.map((q, idx) => {
                  const qId = q._id || q.slug;
                  const v = verdicts[qId];
                  const isActive = currentIdx === idx;
                  return (
                    <button
                      key={qId}
                      className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setCurrentIdx(idx)}
                      style={{
                        flex: 1,
                        minWidth: '55px',
                        fontSize: '0.8rem',
                        fontWeight: isActive ? 700 : 500
                      }}
                    >
                      Q{idx + 1} {v && (v.verdict === 'Accepted' || v.verdict === 'Passed' ? '✓' : '✗')}
                    </button>
                  );
                })}
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIdx === questions.length - 1}
                style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}
                title="Next Question"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>

            {/* Problem Body */}
            <div style={{ flex: 1, minHeight: 0, padding: '1.25rem 1.5rem', overflowY: 'auto' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--text-ink)' }}>
                Q{currentIdx + 1}: {activeQuestion.title}
              </h2>

              <div style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-ink)', whiteSpace: 'pre-wrap', marginBottom: '1.25rem' }}>
                {activeQuestion.description}
              </div>

              {activeQuestion.constraints && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-slate)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Constraints
                  </h4>
                  <pre className="font-mono" style={{ background: 'var(--bg-paper)', border: '1px solid var(--border-color)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: 'var(--text-ink)', margin: 0 }}>
                    {Array.isArray(activeQuestion.constraints) ? activeQuestion.constraints.join('\n') : activeQuestion.constraints}
                  </pre>
                </div>
              )}

              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-slate)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                  Sample Test Cases
                </h4>
                {activeQuestion.testCases && activeQuestion.testCases.filter(tc => !tc.isHidden).length > 0 ? (
                  <table className="data-table" style={{ width: '100%', fontSize: '0.83rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>Sample</th>
                        <th>Input (STDIN)</th>
                        <th>Expected Output (STDOUT)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeQuestion.testCases.filter(tc => !tc.isHidden).map((tc, idx) => (
                        <React.Fragment key={idx}>
                          <tr style={{ borderBottom: tc.explanation ? 'none' : '1px solid var(--border-color)' }}>
                            <td style={{ fontWeight: 600 }}>#{idx + 1}</td>
                            <td className="font-mono" style={{ whiteSpace: 'pre-wrap' }}>{tc.input}</td>
                            <td className="font-mono" style={{ whiteSpace: 'pre-wrap' }}>{tc.expectedOutput}</td>
                          </tr>
                          {tc.explanation && (
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td colSpan={3} style={{ fontSize: '0.78rem', color: 'var(--text-slate)', background: 'var(--bg-paper)', padding: '0.4rem 0.8rem' }}>
                                <em>Explanation: {tc.explanation}</em>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ color: 'var(--text-slate)', fontSize: '0.85rem' }}>No public sample test cases available.</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Code Editor & Console Drawer */}
          <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-paper)', minHeight: 0, overflow: 'hidden' }}>
            
            {/* Language Bar */}
            <div style={{
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-color)',
              padding: '0.4rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-slate)', fontWeight: 600 }}>Programming Language</span>
              <select
                className="form-select"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={executing || submitting || isAutoSubmitting}
                style={{ width: '150px', padding: '0.25rem 0.5rem', fontSize: '0.82rem' }}
              >
                <option value="python">Python 3</option>
                <option value="cpp">C++ (g++)</option>
                <option value="c">C (gcc)</option>
                <option value="java">Java 17</option>
                <option value="javascript">JavaScript (Node)</option>
              </select>
            </div>

            {/* Monaco Editor */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <Editor
                height="100%"
                language={language === 'cpp' || language === 'c' ? 'cpp' : language}
                theme="vs"
                value={codes[activeQuestion._id || activeQuestion.slug] || ''}
                onChange={handleCodeChange}
                options={{
                  fontSize: 13,
                  fontFamily: "'IBM Plex Mono', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbersMinChars: 3,
                  automaticLayout: true,
                  tabSize: 4,
                  readOnly: executing || submitting || isAutoSubmitting
                }}
              />
            </div>

            {/* Action Bar */}
            <div style={{
              background: 'var(--bg-surface)',
              borderTop: '1px solid var(--border-color)',
              padding: '0.6rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                {verdicts[activeQuestion._id || activeQuestion.slug] && (
                  <span className={`badge ${verdicts[activeQuestion._id || activeQuestion.slug].verdict === 'Accepted' || verdicts[activeQuestion._id || activeQuestion.slug].verdict === 'Passed' ? 'badge-passed' : 'badge-hard'}`}>
                    Verdict: {verdicts[activeQuestion._id || activeQuestion.slug].verdict}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleRunCode} disabled={executing || submitting || isAutoSubmitting}>
                  <Play size={13} /> {executing ? 'Running...' : 'Run Code'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSubmitQuestion} disabled={executing || submitting || isAutoSubmitting}>
                  <Send size={13} /> {submitting ? 'Submitting...' : 'Submit Answer'}
                </button>
              </div>
            </div>

            {/* Output Console Drawer */}
            {(() => {
              const qId = activeQuestion._id || activeQuestion.slug;
              const qRunRes = runResults[qId];
              const qVerdict = verdicts[qId];
              const hasOutput = qRunRes || qVerdict;

              return (
                <div style={{
                  height: isConsoleExpanded ? '240px' : '40px',
                  borderTop: '1px solid var(--border-color)',
                  background: 'var(--bg-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0
                }}>
                  <div 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '0.4rem 1rem',
                      background: 'var(--bg-paper)',
                      borderBottom: isConsoleExpanded ? '1px solid var(--border-color)' : 'none',
                      cursor: 'pointer',
                      userSelect: 'none',
                      height: '40px',
                      flexShrink: 0
                    }}
                    onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
                  >
                    <div style={{ color: 'var(--text-slate)', fontWeight: 600, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>::: OUTPUT CONSOLE</span>
                      {qVerdict && (
                        <span style={{ color: qVerdict.verdict === 'Accepted' || qVerdict.verdict === 'Passed' ? 'var(--diff-easy)' : 'var(--diff-hard)' }}>
                          ({qVerdict.verdict})
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'var(--text-slate)', fontSize: '0.75rem', fontWeight: 600 }}>
                      {isConsoleExpanded ? '▼ Minimize' : '▲ Expand'}
                    </div>
                  </div>
                  
                  {isConsoleExpanded && (
                    <div style={{ padding: '0.75rem 1rem', overflowY: 'auto', flex: 1, minHeight: 0, fontSize: '0.83rem' }}>
                      {!hasOutput && !executing && !submitting ? (
                        <div style={{ color: 'var(--text-slate)', fontSize: '0.83rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
                          Console output is empty. Click "Run Code" or "Submit Answer" to see evaluation test results here.
                        </div>
                      ) : executing || submitting ? (
                        <div style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
                          <Clock size={15} className="spin" /> Executing solution in sandbox environment...
                        </div>
                      ) : (
                        <div>
                          {(qRunRes?.compileError ||
                            qVerdict?.compileError ||
                            qRunRes?.error ||
                            (qRunRes?.testResults && qRunRes.testResults.some(t => t.status === 'Compile Error' || (t.stderr && t.stderr.trim().length > 0))) ||
                            qVerdict?.verdict === 'Compile Error') && (
                            <CompileErrorDisplay
                              error={
                                qRunRes?.compileError ||
                                qVerdict?.compileError ||
                                qRunRes?.error ||
                                qRunRes?.testResults?.find(t => t.status === 'Compile Error')?.stderr ||
                                qRunRes?.testResults?.find(t => t.stderr)?.stderr ||
                                qVerdict?.stderr
                              }
                              language={language}
                              title={
                                qVerdict?.verdict === 'Compile Error' ||
                                qRunRes?.compileError ||
                                qRunRes?.testResults?.some(t => t.status === 'Compile Error')
                                  ? 'Compilation Error'
                                  : 'Runtime Error Diagnostics'
                              }
                            />
                          )}

                          {qVerdict && qVerdict.verdict !== 'Compile Error' && (
                            <div style={{
                              padding: '0.75rem 1rem',
                              borderRadius: '8px',
                              background: qVerdict.verdict === 'Accepted' || qVerdict.verdict === 'Passed' ? '#DCFCE7' : '#FEE2E2',
                              color: qVerdict.verdict === 'Accepted' || qVerdict.verdict === 'Passed' ? '#15803D' : '#DC2626',
                              fontWeight: 700,
                              marginBottom: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              border: `1px solid ${qVerdict.verdict === 'Accepted' || qVerdict.verdict === 'Passed' ? '#86EFAC' : '#FCA5A5'}`
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {qVerdict.verdict === 'Accepted' || qVerdict.verdict === 'Passed' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                <span>Verdict: {qVerdict.verdict}</span>
                              </div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                {qVerdict.testCasesPassed || 0} / {qVerdict.totalTestCases || 0} Test Cases Passed &bull; {qVerdict.executionTime || 0}ms &bull; {qVerdict.memoryUsed || 0} KB
                              </div>
                            </div>
                          )}

                          {qRunRes?.testResults && qRunRes.testResults.length > 0 && !qRunRes.testResults.every(t => t.status === 'Compile Error') && (
                            <table className="data-table" style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                              <thead>
                                <tr>
                                  <th>Sample #</th>
                                  <th>Status</th>
                                  <th>Actual Output</th>
                                  <th>Expected Output</th>
                                  <th>Runtime</th>
                                </tr>
                              </thead>
                              <tbody>
                                {qRunRes.testResults.map((tc, idx) => (
                                  <tr key={idx}>
                                    <td>#{tc.testCaseIndex || idx + 1}</td>
                                    <td style={{ fontWeight: 700, color: tc.status === 'Passed' || tc.status === 'Accepted' ? '#15803D' : '#DC2626' }}>
                                      {tc.status}
                                    </td>
                                    <td className="font-mono" style={{ fontSize: '0.8rem' }}>{tc.actualOutput || tc.stdout || '(empty)'}</td>
                                    <td className="font-mono" style={{ fontSize: '0.8rem' }}>{tc.expectedOutput}</td>
                                    <td className="font-mono" style={{ fontSize: '0.8rem' }}>{tc.executionTime || 0}ms</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-slate)' }}>
          Loading contest questions...
        </div>
      )}

      {/* 20-Second Reinstatement Modal */}
      {reinstatedModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          userSelect: 'none'
        }}>
          <div className="glass-card" style={{
            maxWidth: '560px',
            width: '100%',
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '2.5rem 2.25rem',
            textAlign: 'center',
            boxShadow: '0 25px 60px -15px rgba(16, 185, 129, 0.4)',
            border: '2px solid #10B981',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: '#ECFDF5',
              border: '3px solid #10B981',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
              boxShadow: '0 0 24px rgba(16, 185, 129, 0.35)'
            }}>
              <CheckCircle size={44} color="#059669" />
            </div>

            <div style={{
              display: 'inline-block',
              padding: '0.35rem 1rem',
              borderRadius: '20px',
              background: '#ECFDF5',
              color: '#047857',
              border: '1px solid #A7F3D0',
              fontWeight: 800,
              fontSize: '0.82rem',
              letterSpacing: '0.08em',
              marginBottom: '0.85rem',
              textTransform: 'uppercase'
            }}>
              Second Chance Granted • Reinstated
            </div>

            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#065F46', margin: '0 0 0.6rem' }}>
              You Have Been Reinstated
            </h2>

            <p style={{ color: 'var(--text-ink)', fontSize: '0.94rem', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
              The contest administrator has accepted your request and reinstated your qualification. You have been granted a second chance to continue your contest.
            </p>

            <div style={{
              background: '#FFFBEB',
              border: '1px solid #FCD34D',
              borderRadius: '12px',
              padding: '1.1rem 1.25rem',
              textAlign: 'left',
              marginBottom: '1.5rem',
              fontSize: '0.88rem',
              color: '#92400E',
              lineHeight: 1.6
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, color: '#B45309', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                <AlertTriangle size={17} color="#B45309" /> CRITICAL EXAMINATION NOTICE:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li><strong>Do NOT switch browser tabs or open any other windows.</strong></li>
                <li><strong>Do NOT exit Fullscreen mode.</strong></li>
                <li>Your warning count has been reset to <strong>0 / 2</strong>. Reaching the threshold again will result in permanent disqualification.</li>
              </ul>
            </div>

            <div style={{
              background: '#0F172A',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '14px',
              padding: '1.25rem 1rem',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)'
            }}>
              <div style={{
                fontSize: '0.76rem',
                color: '#94A3B8',
                textTransform: 'uppercase',
                fontWeight: 700,
                letterSpacing: '0.08em',
                marginBottom: '0.25rem'
              }}>
                Contest Resuming In
              </div>
              <div style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '3rem',
                fontWeight: 900,
                color: '#34D399',
                letterSpacing: '0.05em',
                lineHeight: 1.1
              }}>
                00:{reinstatedCountdown.toString().padStart(2, '0')}
              </div>
              <span style={{ fontSize: '0.78rem', color: '#94A3B8', display: 'block', marginTop: '0.35rem' }}>
                Stay focused on this window. The screen blur will lift automatically in {reinstatedCountdown}s.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 15-Second Warning Modal with Big Circular Timer */}
      {warningModalOpen && blurCount < maxAllowedBlurs && !contestFinished && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          userSelect: 'none'
        }}>
          <div className="glass-card" style={{
            maxWidth: '540px',
            width: '100%',
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '2.5rem 2.25rem',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.4)',
            border: '2px solid #EF4444'
          }}>
            <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto 1.25rem' }}>
              <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="65"
                  cy="65"
                  r="54"
                  fill="transparent"
                  stroke="#FEE2E2"
                  strokeWidth="8"
                />
                <circle
                  cx="65"
                  cy="65"
                  r="54"
                  fill="transparent"
                  stroke="#DC2626"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 54}
                  strokeDashoffset={2 * Math.PI * 54 * (1 - warningCountdown / 15)}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '2.2rem', fontWeight: 900, color: '#DC2626', lineHeight: 1 }}>
                  {warningCountdown}s
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', marginTop: '3px', letterSpacing: '0.04em' }}>
                  RE-ENTER FS
                </span>
              </div>
            </div>

            <div style={{
              display: 'inline-block',
              padding: '0.35rem 0.9rem',
              borderRadius: '20px',
              background: '#FEE2E2',
              color: '#DC2626',
              fontWeight: 800,
              fontSize: '0.82rem',
              letterSpacing: '0.5px',
              marginBottom: '0.75rem'
            }}>
              PROCTORING WARNING • VIOLATION {blurCount} OF {maxAllowedBlurs}
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#DC2626', margin: '0 0 0.6rem' }}>
              Focus / Fullscreen Violation Detected
            </h2>

            <p style={{ color: 'var(--text-ink)', fontSize: '0.94rem', lineHeight: 1.55, margin: '0 0 1.25rem' }}>
              You have navigated away or lost window focus. <strong>You must return to Fullscreen mode immediately.</strong>
            </p>

            <div style={{
              background: '#FFFBEB',
              border: '1px solid #FCD34D',
              borderRadius: '10px',
              padding: '1rem',
              textAlign: 'left',
              marginBottom: '1.5rem',
              fontSize: '0.88rem',
              color: '#92400E',
              lineHeight: 1.5
            }}>
              <strong>⚠️ CRITICAL RULE:</strong> You have been logged with <strong>{blurCount} of {maxAllowedBlurs} allowed violation(s)</strong>. If you switch windows or exit fullscreen <strong>{Math.max(1, maxAllowedBlurs - blurCount)} more time(s) ({maxAllowedBlurs}/{maxAllowedBlurs})</strong>, your session will be locked out and disqualified.
            </div>

            <button
              className="btn btn-primary"
              onClick={() => {
                if (warningTimerRef.current) clearInterval(warningTimerRef.current);
                setWarningModalOpen(false);
                try {
                  const elem = document.documentElement;
                  if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
                  else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
                  else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
                } catch (e) {}
              }}
              style={{
                width: '100%',
                padding: '0.85rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                borderRadius: '8px',
                background: '#DC2626',
                borderColor: '#DC2626',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)'
              }}
            >
              <Maximize size={18} /> Enter Fullscreen & Continue Contest
            </button>
          </div>
        </div>
      )}

      {/* 15-Second Contest Onboarding Instructions Modal */}
      {showInstructionsModal && !contestFinished && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 99998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #E2E8F0',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ShieldAlert size={24} style={{ color: '#3B82F6' }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Contest Instructions & Rules
                </h2>
              </div>
              <span style={{
                background: '#EFF6FF',
                color: '#2563EB',
                fontWeight: 800,
                fontSize: '0.8rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '20px',
                border: '1px solid #BFDBFE'
              }}>
                Auto-dismiss: {instructionsCountdown}s
              </span>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Welcome to <strong>{contest?.title || 'the Contest Arena'}</strong>. Please review these essential guidelines before you begin:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                <span style={{ color: '#2563EB', fontWeight: 700 }}>1.</span>
                <span style={{ color: '#334155' }}><strong>Fullscreen & Focus:</strong> Stay in fullscreen mode. Tab switching or minimizing the window will trigger security warnings.</span>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                <span style={{ color: '#DC2626', fontWeight: 700 }}>2.</span>
                <span style={{ color: '#334155' }}><strong>Violation Limit:</strong> Exceeding <strong>{maxAllowedBlurs} allowed tab switches</strong> will instantly disqualify you from the contest.</span>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                <span style={{ color: '#2563EB', fontWeight: 700 }}>3.</span>
                <span style={{ color: '#334155' }}><strong>Finish Contest Lock:</strong> The "Finish Contest" button is locked until the final 15 minutes of the contest.</span>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                <span style={{ color: '#16A34A', fontWeight: 700 }}>4.</span>
                <span style={{ color: '#334155' }}><strong>Autosave & Auto-Submit:</strong> Your code is saved continuously and will auto-submit automatically when the countdown hits zero.</span>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setShowInstructionsModal(false)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontWeight: 700,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                borderRadius: '8px'
              }}
            >
              <span>I Understand, Start Solving</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Real-Time Left-Side Host Timer Adjustment Toast */}
      {timerToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 99999,
          background: '#0F172A',
          color: '#FFFFFF',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.4), 0 0 15px rgba(59, 130, 246, 0.5)',
          border: '1.5px solid #3B82F6',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          maxWidth: '420px',
          animation: 'slideInLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <Clock size={20} style={{ color: '#60A5FA', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#93C5FD' }}>Host Sync Notice</div>
            <div style={{ fontSize: '0.82rem', color: '#F1F5F9', marginTop: '2px' }}>{timerToast.message}</div>
          </div>
        </div>
      )}
    </div>
  );
};
