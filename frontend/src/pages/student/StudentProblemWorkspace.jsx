import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Play,
  Send,
  RefreshCw,
  Clock,
  Database,
  CheckCircle,
  XCircle,
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Radio,
  Trophy,
  Eye,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  Lock
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import api from '../../services/api';
import { ResetCodeModal } from '../../components/student/modals/ResetCodeModal';
import { CompileErrorDisplay } from '../../components/common/CompileErrorDisplay';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const formatSecs = (secs) => {
  if (!secs || secs <= 0) return '00:00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const defaultBoilerplates = {
  python: 'import sys\n\ndef solve():\n    lines = sys.stdin.read().split()\n    if not lines: return\n    # Write your solution here...\n    print("Hello CodeArena")\n\nif __name__ == "__main__":\n    solve()',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // Write your solution here...\n    return 0;\n}',
  c: '#include <stdio.h>\n\nint main() {\n    // Write your solution here...\n    return 0;\n}',
  java: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here...\n    }\n}',
  javascript: 'const fs = require("fs");\n\nfunction solve() {\n    const input = fs.readFileSync(0, "utf-8").trim().split(/\\s+/);\n    if (!input || input.length === 0) return;\n    // Write your solution here...\n}\n\nsolve();'
};

export const StudentProblemWorkspace = ({
  problemSlug,
  contestMode = false,
  contest = null,
  allProblems = [],
  onBack,
  onViewLeaderboard
}) => {
  const { user } = useAuth();
  const { socket, joinContest, emitBlurEvent } = useSocket();

  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [practiceProblemsList, setPracticeProblemsList] = useState(allProblems || []);
  const [contestTimeLeft, setContestTimeLeft] = useState(() => {
    if (contest?.endTime) {
      return Math.max(0, Math.floor((new Date(contest.endTime).getTime() - Date.now()) / 1000));
    }
    return contest?.remainingSecs || 0;
  });

  // Countdown timer until contest begins
  const [contestStartsIn, setContestStartsIn] = useState(() => {
    if (!contestMode || !contest) return 0;
    if (contest.startsInSecs !== undefined && contest.startsInSecs !== null) {
      return Math.max(0, contest.startsInSecs);
    }
    if (contest.startTime) {
      const diff = Math.floor((new Date(contest.startTime).getTime() - Date.now()) / 1000);
      return Math.max(0, diff);
    }
    return 0;
  });

  const [contestCompleted, setContestCompleted] = useState(() => {
    if (!contestMode || !contest) return false;
    if (contest.status === 'Ended') return true;
    if (contest.endTime && new Date(contest.endTime).getTime() <= Date.now()) return true;
    if (contest.remainingSecs !== undefined && contest.remainingSecs <= 0 && contest.startsInSecs <= 0) return true;
    return false;
  });

  const [timerToast, setTimerToast] = useState(null);
  const contestEndTimeRef = React.useRef(
    contest?.endTime
      ? new Date(contest.endTime)
      : (contest?.remainingSecs ? new Date(Date.now() + contest.remainingSecs * 1000) : null)
  );

  const [isManuallyFinished, setIsManuallyFinished] = useState(false);
  const [finishModalState, setFinishModalState] = useState(null); // null | 'locked' | 'confirm'
  const [isFinishingContest, setIsFinishingContest] = useState(false);
  const [disqualifiedReason, setDisqualifiedReason] = useState(null);
  const [reinstatedModalOpen, setReinstatedModalOpen] = useState(false);
  const [reinstatedCountdown, setReinstatedCountdown] = useState(20);
  const reinstatedTimerRef = React.useRef(null);
  const [warningCountdown, setWarningCountdown] = useState(15);
  const warningTimerRef = React.useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(!!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement));
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [firstEntryModalOpen, setFirstEntryModalOpen] = useState(false);

  const canFinishContest = contestTimeLeft <= 15 * 60;

  const hasEnteredContestRef = React.useRef(false);
  const isProctoringArmedRef = React.useRef(false);
  const lastViolationTimeRef = React.useRef(0);
  const proctoringArmTimerRef = React.useRef(null);

  const armProctoring = () => {
    if (proctoringArmTimerRef.current) clearTimeout(proctoringArmTimerRef.current);
    hasEnteredContestRef.current = true;
    // 3.5s grace period so any browser window transition / fullscreen animation settles cleanly
    proctoringArmTimerRef.current = setTimeout(() => {
      isProctoringArmedRef.current = true;
    }, 3500);
  };

  const contestId = contest?._id || contest?.slug || contest?.id || 'default_contest';
  const userId = user?._id || user?.id || 'student';
  const reloadFlagKey = `codearena_contest_reload_${contestId}_${userId}`;
  const activeSessionKey = `codearena_contest_active_${contestId}_${userId}`;
  const blurCountKey = `codearena_contest_blurs_${contestId}_${userId}`;

  useEffect(() => {
    if (!contestMode) return;

    // Check for coordinator emergency refresh bypass
    const isCoordinatorBypass = sessionStorage.getItem('codearena_coordinator_bypass_refresh') === 'true';
    if (isCoordinatorBypass) {
      sessionStorage.removeItem('codearena_coordinator_bypass_refresh');
      sessionStorage.removeItem(reloadFlagKey);
      setSecurityAlert('🔑 Coordinator Emergency Reload applied. No integrity violation recorded.');
      setTimeout(() => setSecurityAlert(null), 5000);
      return;
    }

    const isReload = (() => {
      try {
        const hasReloadFlag = !!sessionStorage.getItem(reloadFlagKey);
        const nav = performance.getEntriesByType('navigation');
        const isNavReload = (nav && nav.length > 0 && nav[0].type === 'reload') || (performance.navigation && performance.navigation.type === 1);
        const wasActive = !!sessionStorage.getItem(activeSessionKey);
        return hasReloadFlag || (isNavReload && wasActive);
      } catch (e) {
        return false;
      }
    })();

    sessionStorage.setItem(activeSessionKey, 'true');

    if (isReload && !contestCompletedRef.current) {
      sessionStorage.removeItem(reloadFlagKey);
      // Automatically prompt fullscreen and trigger violation
      setFirstEntryModalOpen(false);
      handleFocusLoss('Page refreshed during contest');
    }
  }, [contestMode]);

  useEffect(() => {
    if (!contestMode && (!allProblems || allProblems.length === 0)) {
      api.get('/questions').then(res => {
        const list = res.data.questions || [];
        setPracticeProblemsList(list);
      }).catch(() => {});
    } else if (allProblems && allProblems.length > 0) {
      setPracticeProblemsList(allProblems);
    }
  }, [contestMode, allProblems]);

  useEffect(() => {
    if (contestMode && contest) {
      const cId = contest._id || contest.id || contest.slug;
      joinContest(cId, {
        contestId: cId,
        contestSlug: contest.slug,
        userId: user?._id || user?.id,
        userName: user?.name,
        teamName: user?.teamName,
        email: user?.email
      });

      // Check if already in fullscreen or prompt student to enter fullscreen
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
      if (!isFs) {
        setFirstEntryModalOpen(true);
      } else {
        armProctoring();
      }
    }
  }, [contestMode, contest?._id, user?._id]);

  useEffect(() => {
    if (!socket) return;

    const handleDisqualified = (data) => {
      setContestCompleted(true);
      contestCompletedRef.current = true;
      setWarningModalOpen(false);
      setDisqualifiedReason(data?.reason || 'You have been disqualified by the contest administrator.');
    };

    const handleQualified = (data) => {
      if (data?.userId && user && String(data.userId) !== String(user._id || user.id)) {
        return;
      }

      const isContestEnded = 
        contestRef.current?.status === 'Ended' ||
        data?.contestStatus === 'Ended' ||
        (contestRef.current?.endTime && new Date(contestRef.current.endTime).getTime() <= Date.now()) ||
        (data?.endTime && new Date(data.endTime).getTime() <= Date.now()) ||
        (contestTimeLeft <= 0 && (!data?.remainingSecs || data.remainingSecs <= 0));

      if (isContestEnded) {
        setDisqualifiedReason(null);
        setContestCompleted(true);
        contestCompletedRef.current = true;
        setWarningModalOpen(false);
        setReinstatedModalOpen(false);
        setSecurityAlert('✅ You have been reinstated by the administrator. The contest has ended and your score is ranked.');
        setTimeout(() => setSecurityAlert(null), 6000);
      } else {
        setContestCompleted(false);
        contestCompletedRef.current = false;
        setDisqualifiedReason(null);
        setBlurCount(0);
        blurCountRef.current = 0;
        setWarningModalOpen(false);
        isProctoringArmedRef.current = false;

        setReinstatedCountdown(20);
        setReinstatedModalOpen(true);
        if (reinstatedTimerRef.current) clearInterval(reinstatedTimerRef.current);

        reinstatedTimerRef.current = setInterval(() => {
          setReinstatedCountdown(prev => {
            if (prev <= 1) {
              clearInterval(reinstatedTimerRef.current);
              setReinstatedModalOpen(false);
              armProctoring();
              setSecurityAlert('✅ Second chance active: Contest resumed! Do not switch tabs or exit fullscreen.');
              setTimeout(() => setSecurityAlert(null), 6000);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    };

    const handleForceSubmit = (data) => {
      if (!contestMode || !contest) return;
      const incomingId = String(data?.contestId || '').trim();
      const validIds = [contest._id, contest.id, contest.slug].filter(Boolean).map(v => String(v).trim());
      if (!incomingId || !validIds.includes(incomingId)) {
        return;
      }
      setContestTimeLeft(0);
      handleAutoSubmitContest();
    };

    const handleTimerSync = (data) => {
      if (!data || !contestMode || !contest) return;
      const incomingId = String(data.contestId || '').trim();
      const validIds = [contest._id, contest.id, contest.slug].filter(Boolean).map(v => String(v).trim());
      if (!incomingId || !validIds.includes(incomingId)) {
        return;
      }

      if (data.remainingSecs !== undefined && data.remainingSecs !== null) {
        const newRemSecs = Math.max(0, parseInt(data.remainingSecs, 10));
        setContestTimeLeft(newRemSecs);
        contestEndTimeRef.current = new Date(Date.now() + newRemSecs * 1000);

        const extra = data.extraMinutes;
        let msg = '';
        let tType = 'sync';
        if (extra !== undefined && extra !== null && Number(extra) !== 0) {
          const numExtra = Number(extra);
          if (numExtra > 0) {
            msg = `⏱️ Contest time has been increased by +${numExtra} min${numExtra > 1 ? 's' : ''} by Host Admin!`;
            tType = 'added';
          } else {
            msg = `⏱️ Contest time has been decreased by ${Math.abs(numExtra)} min${Math.abs(numExtra) > 1 ? 's' : ''} by Host Admin!`;
            tType = 'reduced';
          }
        } else {
          msg = `⏱️ Contest duration updated: ${formatSecs(newRemSecs)} remaining`;
          tType = 'sync';
        }

        const toastId = Date.now();
        setTimerToast({ id: toastId, message: msg, type: tType });
        setTimeout(() => {
          setTimerToast(prev => (prev?.id === toastId ? null : prev));
        }, 6000);

        if (newRemSecs <= 0) {
          handleAutoSubmitContest();
        }
      }
    };

    socket.on('user:disqualified', handleDisqualified);
    socket.on('user:qualified', handleQualified);
    socket.on('contest:force_submit', handleForceSubmit);
    socket.on('contest:ended', handleForceSubmit);
    socket.on('contest:timer_sync', handleTimerSync);

    return () => {
      socket.off('user:disqualified', handleDisqualified);
      socket.off('user:qualified', handleQualified);
      socket.off('contest:force_submit', handleForceSubmit);
      socket.off('contest:ended', handleForceSubmit);
      socket.off('contest:timer_sync', handleTimerSync);
      if (reinstatedTimerRef.current) clearInterval(reinstatedTimerRef.current);
      if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    };
  }, [socket]);

  useEffect(() => {
    if (!contestMode || !disqualifiedReason || !contest) return;
    const cId = contest._id || contest.id || contest.slug;
    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get(`/contests/${cId}`);
        if (res.data?.session && res.data.session.isDisqualified === false) {
          handleQualified({ contestId: cId, ...res.data.session });
        }
      } catch (err) {}
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [contestMode, disqualifiedReason, contest?._id, contest?.slug]);

  useEffect(() => {
    const handleFSChange = () => {
      const isFsNow = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
      setIsFullscreen(isFsNow);

      if (isFsNow) {
        armProctoring();
      } else {
        if (contestMode && !contestCompletedRef.current && isProctoringArmedRef.current && contestStartsIn <= 0) {
          handleFocusLoss('Exited fullscreen mode');
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    document.addEventListener('webkitfullscreenchange', handleFSChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFSChange);
      document.removeEventListener('webkitfullscreenchange', handleFSChange);
    };
  }, [contestMode, contestStartsIn]);

  const enterFullscreen = () => {
    try {
      if (warningTimerRef.current) clearInterval(warningTimerRef.current);
      const elem = document.documentElement;
      if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
      else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
      armProctoring();
      setFirstEntryModalOpen(false);
      setWarningModalOpen(false);
    } catch (e) {
      console.warn('Enter fullscreen error:', e);
    }
  };

  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else {
        enterFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen toggle failed:', e);
    }
  };

  // Editor State
  const [language, setLanguage] = useState('python');
  const [codeMap, setCodeMap] = useState({});
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Execution Console State
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState(null);

  // Anti-Cheat Proctoring State
  const editorRef = React.useRef(null);
  const contestClipboardRef = React.useRef('');
  const [blurCount, setBlurCount] = useState(0);
  const [securityAlert, setSecurityAlert] = useState(null);
  const [antiCheatLogs, setAntiCheatLogs] = useState([]);

  // Refs for callbacks
  const codeMapRef = React.useRef(codeMap);
  const languageRef = React.useRef(language);
  const questionRef = React.useRef(question);
  const contestRef = React.useRef(contest);
  const contestCompletedRef = React.useRef(contestCompleted);
  const blurCountRef = React.useRef(blurCount);
  const antiCheatLogsRef = React.useRef(antiCheatLogs);

  useEffect(() => { codeMapRef.current = codeMap; }, [codeMap]);
  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { questionRef.current = question; }, [question]);
  useEffect(() => { contestRef.current = contest; }, [contest]);
  useEffect(() => { contestCompletedRef.current = contestCompleted; }, [contestCompleted]);
  useEffect(() => { blurCountRef.current = blurCount; }, [blurCount]);
  useEffect(() => { antiCheatLogsRef.current = antiCheatLogs; }, [antiCheatLogs]);

  const handleFocusLoss = (reason = 'Tab switch / focus loss') => {
    if (contestCompletedRef.current || !isProctoringArmedRef.current) return;

    const now = Date.now();
    if (now - lastViolationTimeRef.current < 2000) {
      return;
    }
    lastViolationTimeRef.current = now;

    const nextCount = blurCountRef.current + 1;
    setBlurCount(nextCount);
    blurCountRef.current = nextCount;

    const maxAllowed = contestRef.current?.maxAllowedBlurs !== undefined 
      ? Math.max(1, parseInt(contestRef.current.maxAllowedBlurs, 10) || 2) 
      : 2;

    const newLog = {
      event: `${reason} violation #${nextCount}`,
      timestamp: new Date()
    };
    setAntiCheatLogs(prev => [...prev, newLog]);

    const cId = contestRef.current?._id || contestRef.current?.slug || contestRef.current?.id;
    if (cId) {
      emitBlurEvent({
        contestId: cId,
        userId: user?._id || user?.id,
        userName: user?.name || 'Student',
        teamName: user?.teamName || user?.name || 'Team',
        email: user?.email,
        blurCount: nextCount,
        maxAllowedBlurs: maxAllowed,
        isDisqualified: nextCount >= maxAllowed,
        disqualificationReason: nextCount >= maxAllowed ? `Exceeded maximum allowed window focus / fullscreen violations (${nextCount}/${maxAllowed})` : '',
        event: `${reason} #${nextCount}`
      });

      api.post(`/contests/${cId}/session/event`, {
        event: `${reason} #${nextCount}`,
        blurCount: nextCount
      }).catch(() => {});
    }

    if (nextCount === 1) {
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

      setSecurityAlert(`⚠️ PROCTORING WARNING (Violation 1 of ${maxAllowed}): ${reason} detected! Next violation will result in immediate disqualification.`);
    } else if (nextCount >= maxAllowed) {
      if (warningTimerRef.current) clearInterval(warningTimerRef.current);
      setWarningModalOpen(false);
      handleAutoSubmitContest(true, `You have been disqualified for exceeding the maximum tab switch / fullscreen exit threshold (${nextCount}/${maxAllowed} violations). Only a contest administrator can reinstate your qualification.`);
    }
  };

  useEffect(() => {
    if (!contestMode || contestCompleted || contestStartsIn > 0) return;

    // 1. Right Click Prevention in Contest
    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setSecurityAlert('⚠️ Right-click context menu is disabled during the contest.');
      setTimeout(() => setSecurityAlert(null), 3000);
      return false;
    };

    // 2. Isolated Internal Contest Copy / Cut / Paste (Smart Interviews style)
    const handleCopy = (e) => {
      if (editorRef.current?.hasTextFocus && editorRef.current.hasTextFocus()) {
        return;
      }
      const sel = window.getSelection()?.toString() || '';
      if (sel) {
        contestClipboardRef.current = sel;
        if (e.clipboardData) {
          e.clipboardData.setData('text/plain', sel);
        }
      }
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleCut = (e) => {
      if (editorRef.current?.hasTextFocus && editorRef.current.hasTextFocus()) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handlePaste = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (!contestClipboardRef.current) {
        setSecurityAlert('⚠️ External paste blocked: Only code copied inside this contest editor can be pasted.');
        setTimeout(() => setSecurityAlert(null), 3500);
        return false;
      }
      if (editorRef.current) {
        const sel = editorRef.current.getSelection();
        if (sel) {
          editorRef.current.executeEdits('contest-paste', [{
            range: sel,
            text: contestClipboardRef.current,
            forceMoveMarkers: true
          }]);
          editorRef.current.pushUndoStop();
        }
      }
      return false;
    };

    // 3. Prevent Refresh & Route Keyboard Shortcuts (F5, Ctrl+R, Ctrl+V, Shift+Insert) + Hidden Coordinator Refresh
    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = (e.key || '').toLowerCase();

      // Hidden Coordinator Emergency Refresh: Ctrl + Alt + Shift + R OR Ctrl + Shift + F5
      const isCoordinatorRefresh = 
        (isCtrlOrCmd && e.shiftKey && e.altKey && key === 'r') ||
        (isCtrlOrCmd && e.shiftKey && (key === 'f5' || e.keyCode === 116));

      if (isCoordinatorRefresh) {
        e.preventDefault();
        e.stopPropagation();
        sessionStorage.setItem('codearena_coordinator_bypass_refresh', 'true');
        sessionStorage.removeItem(reloadFlagKey);
        window.location.reload();
        return false;
      }

      // Refresh blocking for students
      if (key === 'f5' || (isCtrlOrCmd && key === 'r')) {
        e.preventDefault();
        e.stopPropagation();
        setSecurityAlert('⚠️ Page refresh is restricted during the contest! Refreshing will record a proctoring violation.');
        setTimeout(() => setSecurityAlert(null), 4000);
        return false;
      }

      // Intercept Paste shortcut (Ctrl+V / Shift+Insert) to only use internal contest clipboard
      if ((isCtrlOrCmd && key === 'v') || (e.shiftKey && key === 'insert')) {
        e.preventDefault();
        e.stopPropagation();
        if (!contestClipboardRef.current) {
          setSecurityAlert('⚠️ External paste blocked: Only code copied inside this contest editor can be pasted.');
          setTimeout(() => setSecurityAlert(null), 3500);
          return false;
        }
        if (editorRef.current) {
          const sel = editorRef.current.getSelection();
          if (sel) {
            editorRef.current.executeEdits('contest-paste', [{
              range: sel,
              text: contestClipboardRef.current,
              forceMoveMarkers: true
            }]);
            editorRef.current.pushUndoStop();
          }
        }
        return false;
      }
    };

    // 4. Beforeunload Warning & Reload Flag
    const handleBeforeUnload = (e) => {
      if (sessionStorage.getItem('codearena_coordinator_bypass_refresh') === 'true') {
        return;
      }
      if (!contestCompletedRef.current) {
        sessionStorage.setItem(reloadFlagKey, JSON.stringify({
          reloadedAt: Date.now(),
          contestId,
          blurCount: blurCountRef.current
        }));
        e.preventDefault();
        e.returnValue = 'Refreshing the contest page will record a proctoring violation. Are you sure you want to refresh?';
        return e.returnValue;
      }
    };

    // 5. Blur & Visibility Change Focus Loss
    const onBlur = () => {
      if (isProctoringArmedRef.current) {
        if (document.hidden) {
          handleFocusLoss('Tab switch / window hidden');
        } else {
          handleFocusLoss('Window focus lost / tab switch');
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden && isProctoringArmedRef.current) {
        handleFocusLoss('Tab switch / window minimized');
      }
    };

    window.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('copy', handleCopy, true);
    document.addEventListener('copy', handleCopy, true);
    window.addEventListener('cut', handleCut, true);
    document.addEventListener('cut', handleCut, true);
    window.addEventListener('paste', handlePaste, true);
    document.addEventListener('paste', handlePaste, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('copy', handleCopy, true);
      window.removeEventListener('cut', handleCut, true);
      document.removeEventListener('cut', handleCut, true);
      window.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('paste', handlePaste, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [contestMode, contestCompleted, contestStartsIn]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    if (!contestMode) return;

    const copyInternal = () => {
      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const selectedText = editor.getModel()?.getValueInRange(selection);
        if (selectedText) {
          contestClipboardRef.current = selectedText;
          try {
            navigator.clipboard.writeText(selectedText).catch(() => {});
          } catch (e) {}
        }
      } else {
        const pos = editor.getPosition();
        if (pos) {
          const lineText = editor.getModel()?.getLineContent(pos.lineNumber);
          if (lineText !== undefined) {
            contestClipboardRef.current = lineText + '\n';
            try {
              navigator.clipboard.writeText(lineText + '\n').catch(() => {});
            } catch (e) {}
          }
        }
      }
    };

    const cutInternal = () => {
      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const selectedText = editor.getModel()?.getValueInRange(selection);
        if (selectedText) {
          contestClipboardRef.current = selectedText;
          try {
            navigator.clipboard.writeText(selectedText).catch(() => {});
          } catch (e) {}
          editor.executeEdits('contest-cut', [{
            range: selection,
            text: '',
            forceMoveMarkers: true
          }]);
          editor.pushUndoStop();
        }
      } else {
        const pos = editor.getPosition();
        if (pos) {
          const model = editor.getModel();
          const lineText = model?.getLineContent(pos.lineNumber);
          if (lineText !== undefined && model) {
            contestClipboardRef.current = lineText + '\n';
            try {
              navigator.clipboard.writeText(lineText + '\n').catch(() => {});
            } catch (e) {}
            const range = pos.lineNumber < model.getLineCount()
              ? new monaco.Range(pos.lineNumber, 1, pos.lineNumber + 1, 1)
              : new monaco.Range(pos.lineNumber, 1, pos.lineNumber, model.getLineMaxColumn(pos.lineNumber));
            editor.executeEdits('contest-cut-line', [{
              range,
              text: '',
              forceMoveMarkers: true
            }]);
            editor.pushUndoStop();
          }
        }
      }
    };

    const pasteInternal = () => {
      if (!contestClipboardRef.current) {
        setSecurityAlert('⚠️ External paste blocked: Only code copied inside this contest editor can be pasted.');
        setTimeout(() => setSecurityAlert(null), 3500);
        return;
      }
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits('contest-paste', [{
          range: selection,
          text: contestClipboardRef.current,
          forceMoveMarkers: true
        }]);
        editor.pushUndoStop();
      }
    };

    // Override Monaco commands to enforce isolated contest clipboard
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, copyInternal);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, cutInternal);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, pasteInternal);
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Insert, pasteInternal);

    editor.onKeyDown((e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (e.keyCode === monaco.KeyCode.F5 || (isCtrlOrCmd && e.keyCode === monaco.KeyCode.KeyR)) {
        e.preventDefault();
        e.stopPropagation();
        setSecurityAlert('⚠️ Page refresh is restricted during the contest!');
        setTimeout(() => setSecurityAlert(null), 3000);
      }
    });

    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.addEventListener('copy', (e) => {
        copyInternal();
        if (e.clipboardData && contestClipboardRef.current) {
          e.clipboardData.setData('text/plain', contestClipboardRef.current);
        }
        e.preventDefault();
        e.stopPropagation();
      }, true);

      domNode.addEventListener('cut', (e) => {
        if (e.clipboardData && contestClipboardRef.current) {
          e.clipboardData.setData('text/plain', contestClipboardRef.current);
        }
        e.preventDefault();
        e.stopPropagation();
      }, true);

      domNode.addEventListener('paste', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        pasteInternal();
      }, true);

      domNode.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setSecurityAlert('⚠️ Right-click context menu is disabled during the contest.');
        setTimeout(() => setSecurityAlert(null), 3000);
      }, true);
    }
  };

  const handleAutoSubmitContest = async (isDisqualified = false, customReason = null) => {
    if (contestCompletedRef.current && !isDisqualified) return;
    contestCompletedRef.current = true;
    setContestCompleted(true);
    isProctoringArmedRef.current = false;

    if (isDisqualified) {
      setDisqualifiedReason(customReason || 'You have been disqualified for exceeding maximum permitted tab switches (2/2 violations).');
    }

    const currentQuestion = questionRef.current;
    const currentLang = languageRef.current || 'python';
    const currentCodeMap = codeMapRef.current || {};
    const currentContest = contestRef.current;
    const userCode = currentCodeMap[currentLang];
    const currentBlurs = blurCountRef.current || 0;
    const currentLogs = antiCheatLogsRef.current || [];

    try {
      if (userCode && userCode.trim().length > 0 && currentQuestion) {
        await api.post('/submissions/submit', {
          questionId: currentQuestion._id || currentQuestion.id || currentQuestion.slug,
          language: currentLang,
          code: userCode,
          contestId: currentContest?._id || currentContest?.slug,
          blurCount: currentBlurs,
          antiCheatLogs: [
            ...currentLogs,
            { event: isDisqualified ? `Auto-Submitted on Disqualification with ${currentBlurs} violations` : `Auto-Submitted on Contest Completion with ${currentBlurs} tab blurs`, timestamp: new Date() }
          ]
        });
      }
      if (currentContest) {
        await api.post(`/contests/${currentContest._id || currentContest.slug}/session/finish`).catch(() => {});
      }
    } catch (e) {
      console.error('Auto submit error:', e);
    }
  };

  const handleManualFinish = async () => {
    setIsFinishingContest(true);
    setIsManuallyFinished(true);
    try {
      await handleAutoSubmitContest(false, 'Contest manually finished and submitted by candidate.');
    } finally {
      setIsFinishingContest(false);
      setFinishModalState(null);
    }
  };

  useEffect(() => {
    fetchProblemDetails();
  }, [problemSlug]);

  useEffect(() => {
    if (contestMode && contest) {
      if (contest.endTime) {
        contestEndTimeRef.current = new Date(contest.endTime);
      } else if (contest.remainingSecs) {
        contestEndTimeRef.current = new Date(Date.now() + contest.remainingSecs * 1000);
      }

      const getLeftSecs = () => {
        if (contestEndTimeRef.current) {
          const diff = Math.floor((contestEndTimeRef.current.getTime() - Date.now()) / 1000);
          return Math.max(0, diff);
        }
        if (contest.endTime) {
          const diff = Math.floor((new Date(contest.endTime).getTime() - Date.now()) / 1000);
          return Math.max(0, diff);
        }
        return Math.max(0, contest.remainingSecs || 0);
      };

      setContestTimeLeft(getLeftSecs());

      const timer = setInterval(() => {
        setContestTimeLeft(prev => {
          const actualLeft = contestEndTimeRef.current
            ? Math.max(0, Math.floor((contestEndTimeRef.current.getTime() - Date.now()) / 1000))
            : Math.max(0, prev - 1);

          if (actualLeft <= 0) {
            clearInterval(timer);
            handleAutoSubmitContest();
            return 0;
          }
          return actualLeft;
        });
      }, 1000);

      const getStartsIn = () => {
        if (contest.startTime) {
          const diff = Math.floor((new Date(contest.startTime).getTime() - Date.now()) / 1000);
          return Math.max(0, diff);
        }
        return Math.max(0, contest.startsInSecs || 0);
      };

      setContestStartsIn(getStartsIn());

      const startTimer = setInterval(() => {
        setContestStartsIn(prev => {
          const actualStartsIn = contest.startTime
            ? Math.max(0, Math.floor((new Date(contest.startTime).getTime() - Date.now()) / 1000))
            : Math.max(0, prev - 1);

          if (actualStartsIn <= 0) {
            clearInterval(startTimer);
            if (prev > 0) {
              const toastId = Date.now();
              setTimerToast({ id: toastId, message: '🚀 The contest has officially started! Good luck!', type: 'added' });
              setTimeout(() => {
                setTimerToast(p => (p?.id === toastId ? null : p));
              }, 7000);
            }
            return 0;
          }
          return actualStartsIn;
        });
      }, 1000);

      const statusPollTimer = setInterval(async () => {
        if (contestCompletedRef.current) {
          clearInterval(statusPollTimer);
          return;
        }
        const cId = contest._id || contest.id || contest.slug;
        if (cId) {
          try {
            const res = await api.get(`/contests/${cId}`);
            if (res.data?.contest) {
              const currentC = res.data.contest;
              if (currentC.status === 'Ended' || currentC.remainingSecs <= 0) {
                clearInterval(statusPollTimer);
                handleAutoSubmitContest();
              }
            }
          } catch (e) {}
        }
      }, 3000);

      return () => {
        clearInterval(timer);
        clearInterval(startTimer);
        clearInterval(statusPollTimer);
      };
    }
  }, [contestMode, contest?._id || contest?.id]);

  const fetchProblemDetails = async (targetSlug = problemSlug) => {
    let slugStr = targetSlug;
    if (typeof slugStr === 'object' && slugStr !== null) {
      slugStr = slugStr.slug || slugStr._id || slugStr.id || '';
    }
    if (!slugStr && contestMode && contest?.problems && contest.problems.length > 0) {
      const first = contest.problems[0];
      slugStr = typeof first === 'object' ? (first.slug || first._id || first.id) : first;
    }
    if (!slugStr) return;

    try {
      setLoading(true);
      setExecResult(null);

      let data = null;

      if (contestMode && contest?.problems) {
        const matchingContestProb = contest.problems.find(p => {
          if (!p || typeof p !== 'object') return false;
          return p.slug === slugStr || String(p._id) === String(slugStr) || String(p.id) === String(slugStr);
        });
        if (matchingContestProb && (matchingContestProb.sampleTestCases || matchingContestProb.testCases || matchingContestProb.description)) {
          data = matchingContestProb;
        }
      }

      try {
        const res = await api.get(`/questions/${slugStr}`);
        if (res.data?.question || res.data) {
          data = res.data.question || res.data;
        }
      } catch (e) {
        console.warn('Direct problem fetch fallback:', e);
        if (!data) {
          const listRes = await api.get('/questions').catch(() => null);
          const questionsList = listRes?.data?.questions || [];
          if (questionsList.length > 0) {
            data = questionsList[0];
          }
        }
      }

      if (data) {
        setQuestion(data);
        const pKey = data._id || data.slug || slugStr;

        const loadCodeForLang = (lang) => {
          try {
            const saved = localStorage.getItem(`codearena_user_code_${pKey}_${lang}`);
            if (saved !== null && saved.trim() !== '') return saved;
          } catch (e) {}
          return data.starterCode?.[lang] || (lang === 'python' ? data.templateCode : null) || defaultBoilerplates[lang] || '';
        };

        const freshCodeMap = {
          python: loadCodeForLang('python'),
          cpp: loadCodeForLang('cpp'),
          c: loadCodeForLang('c'),
          java: loadCodeForLang('java'),
          javascript: loadCodeForLang('javascript')
        };

        setCodeMap(freshCodeMap);
      }
    } catch (err) {
      console.error('Error fetching problem details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    const pKey = question?._id || question?.slug || problemSlug;
    let savedCode = codeMap[newLang];

    if (!savedCode && pKey) {
      try {
        const stored = localStorage.getItem(`codearena_user_code_${pKey}_${newLang}`);
        if (stored !== null && stored.trim() !== '') savedCode = stored;
      } catch (e) {}
    }

    if (!savedCode) {
      savedCode = question?.starterCode?.[newLang] || (newLang === 'python' ? question?.templateCode : null) || defaultBoilerplates[newLang] || '';
    }

    setCodeMap(prev => ({ ...prev, [newLang]: savedCode }));
  };

  const handleCodeChange = (val) => {
    const codeVal = val || '';
    setCodeMap(prev => ({ ...prev, [language]: codeVal }));
    const pKey = question?._id || question?.slug || problemSlug;
    if (pKey) {
      try {
        localStorage.setItem(`codearena_user_code_${pKey}_${language}`, codeVal);
      } catch (e) {}
    }
  };

  const handleResetCode = () => {
    const defaultCode = question?.starterCode?.[language] || (language === 'python' ? question?.templateCode : null) || defaultBoilerplates[language] || '';
    setCodeMap(prev => ({ ...prev, [language]: defaultCode }));
    const pKey = question?._id || question?.slug || problemSlug;
    if (pKey) {
      try {
        localStorage.removeItem(`codearena_user_code_${pKey}_${language}`);
      } catch (e) {}
    }
  };

  const handleRunCode = async () => {
    try {
      setExecuting(true);
      setConsoleOpen(true);
      setExecResult({ status: 'Running', message: 'Executing code against sample test cases...' });

      const qId = question?._id || question?.id || question?.slug || (typeof problemSlug === 'object' ? (problemSlug?.slug || problemSlug?._id) : problemSlug);

      const res = await api.post('/submissions/run', {
        questionId: qId,
        language,
        code: codeMap[language] !== undefined ? codeMap[language] : (defaultBoilerplates[language] || '')
      });

      const anyStderr = (res.data.testResults && res.data.testResults.find(d => d.stderr)?.stderr) || res.data.stderr;

      setExecResult({
        type: 'run',
        success: true,
        testResults: res.data.testResults || [],
        stdout: res.data.stdout,
        stderr: anyStderr,
        executionTime: res.data.executionTime
      });
    } catch (err) {
      setExecResult({
        type: 'run',
        success: false,
        message: err.response?.data?.message || 'Execution error'
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleSubmitCode = async () => {
    try {
      setExecuting(true);
      setConsoleOpen(true);
      setExecResult({ status: 'Evaluating', message: 'Evaluating solution against hidden official test cases...' });

      const qId = question?._id || question?.id || question?.slug || (typeof problemSlug === 'object' ? (problemSlug?.slug || problemSlug?._id) : problemSlug);

      const res = await api.post('/submissions/submit', {
        questionId: qId,
        language,
        code: codeMap[language] !== undefined ? codeMap[language] : (defaultBoilerplates[language] || ''),
        contestId: contestMode && contest ? (contest._id || contest.id || contest.slug) : null,
        blurCount: blurCountRef.current || 0,
        antiCheatLogs: antiCheatLogsRef.current || []
      });

      const sub = res.data.submission || res.data;
      const subScore = sub.score !== undefined ? sub.score : 0;
      const subStderr = res.data.stderr || sub.stderr || (sub.details && sub.details.find(d => d.stderr)?.stderr);
      setExecResult({
        type: 'submit',
        success: true,
        verdict: sub.verdict || sub.status || 'Accepted',
        score: subScore,
        stderr: subStderr,
        passedTests: sub.passedTests || sub.testCasesPassed,
        totalTests: sub.totalTests || sub.totalTestCases,
        executionTime: sub.executionTime,
        memory: sub.memory
      });
    } catch (err) {
      setExecResult({
        type: 'submit',
        success: false,
        message: err.response?.data?.message || 'Submission evaluation error'
      });
    } finally {
      setExecuting(false);
    }
  };

  // Waiting Room View before Contest Starts
  if (contestMode && contestStartsIn > 0 && !contestCompleted) {
    const days = Math.floor(contestStartsIn / 86400);
    const hrs = Math.floor((contestStartsIn % 86400) / 3600);
    const mins = Math.floor((contestStartsIn % 3600) / 60);
    const secs = contestStartsIn % 60;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #0B1120 0%, #0F172A 50%, #1E293B 100%)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        color: '#FFFFFF',
        fontFamily: 'IBM Plex Sans, sans-serif',
        overflowY: 'auto'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: '20px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#60A5FA',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginBottom: '0.75rem',
            letterSpacing: '0.5px'
          }}>
            <Clock size={16} /> CONTEST SCHEDULED • WAITING LOBBY
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, margin: '0 0 0.5rem', letterSpacing: '-0.5px', color: '#FFFFFF' }}>
            {contest?.title || 'Competitive Programming Contest'}
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.5 }}>
            {contest?.description || 'The contest has not started yet. Please review the instructions below. The workspace and problems will automatically unlock when the countdown reaches zero.'}
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          alignItems: 'center',
          margin: '1.5rem 0 2rem',
          flexWrap: 'wrap'
        }}>
          {days > 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1.25rem 1.5rem',
              minWidth: '100px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <span style={{ fontSize: '2.8rem', fontWeight: 900, fontFamily: 'IBM Plex Mono, monospace', color: '#38BDF8', display: 'block', lineHeight: 1 }}>
                {String(days).padStart(2, '0')}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px' }}>Days</span>
            </div>
          )}

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            minWidth: '100px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{ fontSize: '2.8rem', fontWeight: 900, fontFamily: 'IBM Plex Mono, monospace', color: '#38BDF8', display: 'block', lineHeight: 1 }}>
              {String(hrs).padStart(2, '0')}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px' }}>Hours</span>
          </div>

          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'rgba(255, 255, 255, 0.3)' }}>:</div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            minWidth: '100px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{ fontSize: '2.8rem', fontWeight: 900, fontFamily: 'IBM Plex Mono, monospace', color: '#38BDF8', display: 'block', lineHeight: 1 }}>
              {String(mins).padStart(2, '0')}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px' }}>Minutes</span>
          </div>

          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'rgba(255, 255, 255, 0.3)' }}>:</div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            minWidth: '100px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 0 25px rgba(59, 130, 246, 0.2)'
          }}>
            <span style={{ fontSize: '2.8rem', fontWeight: 900, fontFamily: 'IBM Plex Mono, monospace', color: '#60A5FA', display: 'block', lineHeight: 1 }}>
              {String(secs).padStart(2, '0')}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '1px' }}>Seconds</span>
          </div>
        </div>

        <div style={{
          maxWidth: '680px',
          width: '100%',
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '14px',
          padding: '1.5rem 1.75rem',
          backdropFilter: 'blur(12px)',
          marginBottom: '1.75rem'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.85rem', color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} color="#F59E0B" /> Contest Rules & Anti-Cheat Instructions
          </h3>

          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#CBD5E1', fontSize: '0.9rem', lineHeight: 1.6 }}>
            <li><strong>Fullscreen Requirement:</strong> Once the contest begins, you will be prompted to remain in fullscreen mode.</li>
            <li><strong>Tab Switching & Focus Loss:</strong> Navigating away from this tab, opening other applications, or minimizing the browser will be recorded as a violation.</li>
            <li><strong>Disqualification Limit:</strong> 2 violations will result in automatic lockout and disqualification.</li>
            <li><strong>Supported Languages:</strong> C, C++, Java, Python, and JavaScript with automated test case evaluation.</li>
            <li><strong>Live Submission Scoring:</strong> Tests run against pre-configured public and hidden official test cases upon submission.</li>
          </ul>

          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            color: '#FCD34D',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertTriangle size={16} /> Do not close or refresh this tab. When the timer hits 00:00, the questions and IDE will unlock automatically.
          </div>
        </div>

        <button
          className="btn btn-secondary"
          onClick={onBack}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#E2E8F0',
            padding: '0.65rem 1.5rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} /> Exit Waiting Lobby to Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-slate)' }}>
        Loading Problem Workspace...
      </div>
    );
  }

  if (!question) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <h3>Problem Not Found</h3>
        <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Back to Practice
        </button>
      </div>
    );
  }

  const activeProblemsList = contestMode && contest?.problems
    ? contest.problems
    : (practiceProblemsList.length > 0 ? practiceProblemsList : (allProblems || []));
  
  const getProblemIdentifier = (p) => {
    if (!p) return '';
    if (typeof p === 'string') return p;
    return p.slug || p._id || p.id || '';
  };

  const currentProblemIndex = activeProblemsList.findIndex(p => {
    if (!p || !question) return false;
    const pId = typeof p === 'string' ? p : (p._id || p.id);
    const pSlug = typeof p === 'object' ? p.slug : null;
    const pTitle = typeof p === 'object' ? p.title : null;

    const qId = question._id || question.id;
    const qSlug = question.slug;
    const qTitle = question.title;

    const idMatch = pId && qId && String(pId) === String(qId);
    const slugMatch = (pSlug && qSlug && pSlug === qSlug) ||
                      (pId && qSlug && String(pId) === String(qSlug)) ||
                      (pSlug && qId && String(pSlug) === String(qId));
    const titleMatch = pTitle && qTitle && String(pTitle).toLowerCase().trim() === String(qTitle).toLowerCase().trim();

    return idMatch || slugMatch || titleMatch;
  });

  const selectedOptionValue = (() => {
    if (currentProblemIndex >= 0 && activeProblemsList[currentProblemIndex]) {
      return getProblemIdentifier(activeProblemsList[currentProblemIndex]);
    }
    if (question) {
      const matched = activeProblemsList.find(p => {
        const pId = typeof p === 'string' ? p : (p._id || p.id);
        const pSlug = typeof p === 'object' ? p.slug : null;
        const pTitle = typeof p === 'object' ? p.title : null;
        return (
          (pSlug && question.slug && pSlug === question.slug) ||
          (pId && question._id && String(pId) === String(question._id)) ||
          (pTitle && question.title && String(pTitle).toLowerCase().trim() === String(question.title).toLowerCase().trim())
        );
      });
      if (matched) return getProblemIdentifier(matched);
    }
    return activeProblemsList.length > 0 ? getProblemIdentifier(activeProblemsList[0]) : '';
  })();

  const hasPrevQuestion = activeProblemsList.length > 1 && currentProblemIndex > 0;
  const hasNextQuestion = activeProblemsList.length > 1 && currentProblemIndex >= 0 && currentProblemIndex < activeProblemsList.length - 1;

  const handleGoToPrevQuestion = () => {
    if (hasPrevQuestion) {
      const prevP = activeProblemsList[currentProblemIndex - 1];
      fetchProblemDetails(getProblemIdentifier(prevP));
    }
  };

  const handleGoToNextQuestion = () => {
    if (hasNextQuestion) {
      const nextP = activeProblemsList[currentProblemIndex + 1];
      fetchProblemDetails(getProblemIdentifier(nextP));
    }
  };

  if (contestCompleted) {
    if (disqualifiedReason) {
      return (
        <div className="container" style={{ padding: '3rem 1.5rem', maxWidth: '720px', textAlign: 'center' }}>
          <div className="glass-card" style={{ padding: '2.5rem', borderTop: '4px solid #DC2626', background: '#FFFFFF', borderRadius: '16px', boxShadow: '0 20px 40px -15px rgba(220, 38, 38, 0.2)' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: '#FEE2E2',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem'
            }}>
              <XCircle size={44} color="#DC2626" />
            </div>

            <div style={{
              display: 'inline-block',
              padding: '0.3rem 0.85rem',
              borderRadius: '20px',
              background: '#FEE2E2',
              color: '#DC2626',
              fontWeight: 800,
              fontSize: '0.82rem',
              letterSpacing: '0.5px',
              marginBottom: '0.75rem'
            }}>
              PROCTORING INTEGRITY LOCKOUT
            </div>

            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#DC2626' }}>
              Participant Disqualified
            </h2>

            <p style={{ color: 'var(--text-ink)', margin: '0.5rem 0 1.25rem', lineHeight: 1.6, fontSize: '0.96rem' }}>
              {disqualifiedReason}
            </p>

            <div style={{
              background: '#F8FAFC',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '1.25rem',
              textAlign: 'left',
              marginBottom: '1.75rem',
              fontSize: '0.88rem',
              color: 'var(--text-slate)',
              lineHeight: 1.6
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-ink)', fontWeight: 700, marginBottom: '0.5rem' }}>
                <ShieldAlert size={16} color="#DC2626" /> Qualification Policy:
              </div>
              <p style={{ margin: '0 0 0.5rem' }}>
                • You have exceeded the permitted threshold of <strong>{contest?.maxAllowedBlurs !== undefined ? contest.maxAllowedBlurs : 2} tab switches / fullscreen exits</strong>.
              </p>
              <p style={{ margin: '0 0 0.5rem' }}>
                • <strong>Only a Contest Administrator</strong> has the authority to reinstate your qualification.
              </p>
              <p style={{ margin: 0, color: 'var(--accent-blue)', fontWeight: 600 }}>
                🟢 <em>Live Proctoring Sync: If the administrator reinstates you from their dashboard, this workspace will unlock automatically in real-time.</em>
              </p>
            </div>

            <button className="btn btn-secondary" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}>
              <ArrowLeft size={16} /> Exit to Student Portal
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="container" style={{ padding: '3rem 1.5rem', maxWidth: '700px', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '2.5rem' }}>
          <Trophy size={48} color="var(--accent-blue)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
            {isManuallyFinished ? 'Contest Finished & Submitted' : 'Contest Timings Completed'}
          </h2>
          <p style={{ color: 'var(--text-slate)', margin: '0.5rem 0 1.5rem', lineHeight: 1.5 }}>
            {isManuallyFinished
              ? 'You have successfully concluded your contest participation. All written solutions have been submitted and evaluated.'
              : 'The contest timings are completed. All of your written solutions have been automatically submitted and evaluated.'}
          </p>

          <button
            className="btn btn-primary"
            onClick={() => {
              if (onViewLeaderboard) {
                onViewLeaderboard(contest?._id || contest?.id || contest?.slug);
              } else if (onBack) {
                onBack();
              }
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Eye size={16} /> View Results
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-paper)', position: 'relative' }}>
      {/* Top-Right Real-Time Contest Timer Toast Notification */}
      {timerToast && (
        <div
          style={{
            position: 'fixed',
            top: '1.25rem',
            right: '1.25rem',
            zIndex: 9999999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.85rem 1.15rem',
            borderRadius: '12px',
            background: timerToast.type === 'reduced' ? '#FEF2F2' : (timerToast.type === 'added' ? '#F0FDF4' : '#EFF6FF'),
            border: `2px solid ${timerToast.type === 'reduced' ? '#F87171' : (timerToast.type === 'added' ? '#4ADE80' : '#60A5FA')}`,
            boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.22), 0 4px 12px -2px rgba(0, 0, 0, 0.1)',
            color: timerToast.type === 'reduced' ? '#991B1B' : (timerToast.type === 'added' ? '#166534' : '#1E40AF'),
            fontWeight: 700,
            fontSize: '0.9rem',
            animation: 'fadeIn 0.3s ease-out',
            maxWidth: '440px'
          }}
        >
          <Clock size={20} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, lineHeight: 1.4 }}>{timerToast.message}</span>
          <button
            onClick={() => setTimerToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.75
            }}
            title="Dismiss notification"
          >
            <XCircle size={18} />
          </button>
        </div>
      )}

      {/* Workspace Top Header Bar */}
      <div style={{
        height: '52px',
        background: '#FFFFFF',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
          {!contestMode ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onBack}
              style={{
                height: '32px',
                padding: '0 0.7rem',
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <ArrowLeft size={13} /> Back to Practice
            </button>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              color: '#166534',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.5px'
            }}>
              <Trophy size={13} color="#16A34A" />
              <span>{contest?.title ? (contest.title.length > 20 ? contest.title.substring(0, 20) + '...' : contest.title) : 'CONTEST ROUND'}</span>
            </div>
          )}

          {activeProblemsList.length > 1 ? (
            <select
              value={selectedOptionValue}
              onChange={(e) => fetchProblemDetails(e.target.value)}
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--accent-blue)',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--text-ink)',
                background: '#F0F9FF',
                maxWidth: '280px',
                outline: 'none'
              }}
            >
              {activeProblemsList.map((p, idx) => {
                const val = getProblemIdentifier(p);
                const pTitle = typeof p === 'string' ? `Problem ${idx + 1}` : (p.title || `Problem ${idx + 1}`);
                return (
                  <option key={val || idx} value={val}>
                    Problem {idx + 1}: {pTitle}
                  </option>
                );
              })}
            </select>
          ) : (
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-ink)' }}>
              {question?.title}
            </h3>
          )}

          <span style={{
            padding: '0.15rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: question.difficulty === 'Easy' ? '#DCFCE7' : (question.difficulty === 'Medium' ? '#FEF3C7' : '#FEE2E2'),
            color: question.difficulty === 'Easy' ? '#15803D' : (question.difficulty === 'Medium' ? '#D97706' : '#B91C1C')
          }}>
            {question.difficulty || 'Medium'}
          </span>
        </div>

        {/* Contest Mode Timer & Integrity Indicator & Mini Circular Violations Figure */}
        {contestMode && contest && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#15803D', fontSize: '0.8rem', fontWeight: 700 }}>
              <ShieldAlert size={14} />
              <span>🟢 Live Proctoring</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: '20px', background: '#FEE2E2', color: '#DC2626' }}>
              <Radio size={14} className="pulse-icon" />
              <strong style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.9rem' }}>
                {formatSecs(contestTimeLeft)}
              </strong>
            </div>

            {/* Mini Visible Circular Figure for Attempted Violations */}
            <div
              title={`Proctoring Violations: ${blurCount} of 2 max`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '20px',
                background: blurCount === 0 ? '#F0FDF4' : (blurCount === 1 ? '#FEF3C7' : '#FEE2E2'),
                border: `1.5px solid ${blurCount === 0 ? '#86EFAC' : (blurCount === 1 ? '#FCD34D' : '#FCA5A5')}`,
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
                    stroke={blurCount === 0 ? '#DCFCE7' : (blurCount === 1 ? '#FDE68A' : '#FECACA')}
                    strokeWidth="3"
                  />
                  <circle
                    cx="13"
                    cy="13"
                    r="10"
                    fill="transparent"
                    stroke={blurCount === 0 ? '#16A34A' : (blurCount === 1 ? '#D97706' : '#DC2626')}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 10}
                    strokeDashoffset={2 * Math.PI * 10 * (1 - Math.min(blurCount, 2) / 2)}
                    style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                  />
                </svg>
                <span style={{
                  position: 'absolute',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  color: blurCount === 0 ? '#16A34A' : (blurCount === 1 ? '#D97706' : '#DC2626')
                }}>
                  {blurCount}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: blurCount === 0 ? '#15803D' : (blurCount === 1 ? '#B45309' : '#B91C1C'),
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}>
                  {blurCount === 0 ? '0/2 Blurs' : `${blurCount}/2 Blurs`}
                </span>
                <span style={{ fontSize: '0.6rem', color: blurCount === 0 ? '#166534' : (blurCount === 1 ? '#92400E' : '#991B1B') }}>
                  {blurCount === 0 ? 'Clear' : (blurCount === 1 ? '1 Warning' : 'Lockout')}
                </span>
              </div>
            </div>

            <button
              className={`btn btn-sm ${canFinishContest ? 'btn-danger' : 'btn-secondary'}`}
              onClick={() => {
                if (!canFinishContest) {
                  const rem = Math.max(0, contestTimeLeft - 900);
                  setSecurityAlert(`⏳ Finish Contest is locked: It unlocks during the final 15 minutes of the contest (in ${formatSecs(rem)}).`);
                  setTimeout(() => setSecurityAlert(null), 4000);
                  return;
                }
                setFinishModalState('confirm');
              }}
              disabled={isFinishingContest}
              title={canFinishContest ? "Finish Contest: Submit solutions and end session" : `Unlocks during the final 15 minutes (in ${formatSecs(Math.max(0, contestTimeLeft - 900))})`}
              style={{
                height: '32px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: canFinishContest ? 'pointer' : 'not-allowed',
                opacity: canFinishContest ? 1 : 0.65,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: canFinishContest ? '#DC2626' : '#F1F5F9',
                color: canFinishContest ? '#FFFFFF' : '#64748B',
                border: canFinishContest ? '1px solid #DC2626' : '1px solid #CBD5E1'
              }}
            >
              {canFinishContest ? <CheckCircle size={14} /> : <Lock size={13} />}
              <span>Finish Contest</span>
              {!canFinishContest && <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>(Locked &gt;15m)</span>}
            </button>
          </div>
        )}

        {/* Language Selector & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <select
            value={language}
            onChange={e => handleLanguageChange(e.target.value)}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: '#FFF',
              fontSize: '0.82rem',
              fontWeight: 600
            }}
          >
            <option value="python">Python 3</option>
            <option value="cpp">C++17</option>
            <option value="c">C</option>
            <option value="java">Java 17</option>
            <option value="javascript">JavaScript</option>
          </select>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setResetModalOpen(true)}
            title="Reset code template"
          >
            <RefreshCw size={13} /> Reset
          </button>

          {!contestMode && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
              <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Proctoring Security Alert Banner */}
      {securityAlert && (
        <div style={{
          background: '#FEE2E2',
          borderBottom: '1px solid #F87171',
          padding: '0.45rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#DC2626',
          fontSize: '0.85rem',
          fontWeight: 700,
          animation: 'pulse 1.5s infinite'
        }}>
          <ShieldAlert size={16} color="#DC2626" />
          <span>{securityAlert}</span>
        </div>
      )}

      {/* Main Split-Pane Body */}
      <div className="student-workspace-split" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Pane: Problem Statement */}
        <div style={{
          width: '45%',
          height: '100%',
          borderRight: '1px solid var(--border-color)',
          background: '#FFFFFF',
          padding: '1.5rem',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: 'var(--accent-blue)',
                background: 'var(--accent-blue-light)',
                padding: '0.2rem 0.55rem',
                borderRadius: '4px',
                letterSpacing: '0.5px'
              }}>
                {currentProblemIndex >= 0 ? `PROBLEM ${currentProblemIndex + 1} OF ${activeProblemsList.length}` : (contestMode ? 'CONTEST PROBLEM' : 'PRACTICE PROBLEM')}
              </span>

              <span style={{
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 700,
                background: question.difficulty === 'Easy' ? '#DCFCE7' : (question.difficulty === 'Medium' ? '#FEF3C7' : '#FEE2E2'),
                color: question.difficulty === 'Easy' ? '#15803D' : (question.difficulty === 'Medium' ? '#D97706' : '#B91C1C')
              }}>
                {question.difficulty || 'Medium'}
              </span>
            </div>

            {activeProblemsList.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleGoToPrevQuestion}
                  disabled={!hasPrevQuestion}
                  title="Go to Previous Question"
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.78rem',
                    opacity: !hasPrevQuestion ? 0.45 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    cursor: !hasPrevQuestion ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronLeft size={13} /> Prev Question
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleGoToNextQuestion}
                  disabled={!hasNextQuestion}
                  title="Go to Next Question"
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.78rem',
                    opacity: !hasNextQuestion ? 0.45 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    cursor: !hasNextQuestion ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next Question <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>

          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-ink)' }}>
            {question.title}
          </h2>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--text-slate)' }}>
            <span>Points: <strong style={{ color: 'var(--accent-blue)' }}>{question.points || 100} pts</strong></span>
            <span>Time Limit: <strong>{question.timeLimit || 2000}ms</strong></span>
            <span>Memory Limit: <strong>{question.memoryLimit || 256}MB</strong></span>
          </div>

          <div style={{ marginBottom: '1.5rem', lineHeight: 1.6, fontSize: '0.92rem', color: 'var(--text-ink)' }}>
            <p style={{ whiteSpace: 'pre-wrap' }}>{question.description}</p>
          </div>

          {question.inputFormat && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>Input Format (STDIN)</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-slate)', whiteSpace: 'pre-wrap' }}>{question.inputFormat}</p>
            </div>
          )}

          {question.outputFormat && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>Output Format (STDOUT)</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-slate)', whiteSpace: 'pre-wrap' }}>{question.outputFormat}</p>
            </div>
          )}

          {question.constraints && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.4rem' }}>Constraints</h4>
              <pre style={{
                background: 'var(--bg-paper)',
                border: '1px solid var(--border-color)',
                padding: '0.65rem 0.85rem',
                borderRadius: '4px',
                fontSize: '0.83rem',
                color: 'var(--text-ink)',
                fontFamily: 'IBM Plex Mono, monospace',
                margin: 0,
                whiteSpace: 'pre-wrap'
              }}>
                {Array.isArray(question.constraints) ? question.constraints.join('\n') : question.constraints}
              </pre>
            </div>
          )}

          {(() => {
            const sampleCases = (question.sampleTestCases && question.sampleTestCases.length > 0)
              ? question.sampleTestCases
              : (question.testCases ? question.testCases.filter(tc => !tc.isHidden) : []);

            if (!sampleCases || sampleCases.length === 0) return null;

            return (
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-ink)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  🧪 Sample Test Cases
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {sampleCases.map((tc, idx) => (
                    <div key={idx} style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: '#F8FAFC'
                    }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-blue)', display: 'block', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
                        SAMPLE CASE #{idx + 1} {tc.marks ? `(${tc.marks} pts)` : ''}
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.82rem' }}>
                        <div style={{ background: '#FFFFFF', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <span style={{ color: 'var(--text-slate)', fontSize: '0.7rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>INPUT (STDIN):</span>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-ink)' }}>{tc.input || '(empty)'}</pre>
                        </div>
                        <div style={{ background: '#FFFFFF', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <span style={{ color: 'var(--text-slate)', fontSize: '0.7rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>EXPECTED OUTPUT (STDOUT):</span>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-ink)' }}>{tc.expectedOutput || '(empty)'}</pre>
                        </div>
                      </div>
                      {tc.explanation && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-slate)', fontStyle: 'italic' }}>
                          <strong>Explanation:</strong> {tc.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right Pane: Monaco Editor & Console */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: '#FFFFFF'
        }}>
          {/* Monaco Code Editor */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <Editor
              height="100%"
              language={language === 'cpp' || language === 'c' ? 'cpp' : language}
              theme="vs"
              value={codeMap[language] !== undefined ? codeMap[language] : (defaultBoilerplates[language] || '')}
              onChange={handleCodeChange}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'IBM Plex Mono, monospace',
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                autoIndent: 'full',
                bracketPairColorization: { enabled: true },
                contextmenu: !contestMode,
                dragAndDrop: !contestMode,
                selectionClipboard: !contestMode,
                links: !contestMode
              }}
            />
          </div>

          {/* Execution Bar */}
          <div style={{
            height: '52px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-paper)',
            padding: '0 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setConsoleOpen(!consoleOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Console {consoleOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleRunCode}
                disabled={executing}
              >
                <Play size={14} /> 🧪 Run Code (Dry Run)
              </button>

              <button
                className="btn btn-primary btn-sm"
                onClick={handleSubmitCode}
                disabled={executing}
              >
                <Send size={14} /> 🚀 Submit Code
              </button>
            </div>
          </div>

          {/* Expandable Console Drawer */}
          {consoleOpen && (
            <div style={{
              height: execResult?.stderr || execResult?.compileError || execResult?.verdict === 'Compile Error' ? '280px' : '220px',
              borderTop: '1px solid var(--border-color)',
              background: '#FFFFFF',
              padding: '0.85rem 1.25rem',
              overflowY: 'auto',
              flexShrink: 0,
              transition: 'height 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-ink)' }}>Execution &amp; Evaluation Output</strong>
                  {execResult?.verdict && (
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      background: execResult.verdict === 'Accepted' || execResult.verdict === 'Passed' ? '#DCFCE7' : '#FEE2E2',
                      color: execResult.verdict === 'Accepted' || execResult.verdict === 'Passed' ? '#15803D' : '#DC2626',
                      border: `1px solid ${execResult.verdict === 'Accepted' || execResult.verdict === 'Passed' ? '#86EFAC' : '#FCA5A5'}`
                    }}>
                      {execResult.verdict} {execResult.score !== undefined ? `(${execResult.score} pts)` : ''}
                    </span>
                  )}
                </div>
                <button onClick={() => setConsoleOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-slate)' }}>
                  <ChevronDown size={16} />
                </button>
              </div>

              {executing ? (
                <div style={{ color: 'var(--accent-blue)', fontSize: '0.85rem', padding: '1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <RefreshCw size={14} className="spin" /> Executing solution in sandbox environment...
                </div>
              ) : execResult ? (
                <div>
                  {(execResult.verdict === 'Compile Error' || 
                    execResult.compileError || 
                    (execResult.stderr && execResult.stderr.trim().length > 0) ||
                    execResult.testResults?.some(t => t.status === 'Compile Error' || (t.stderr && t.stderr.trim().length > 0))) && (
                    <CompileErrorDisplay
                      error={
                        execResult.compileError ||
                        execResult.stderr ||
                        execResult.testResults?.find(t => t.status === 'Compile Error')?.stderr ||
                        execResult.testResults?.find(t => t.stderr)?.stderr
                      }
                      language={language}
                      title={
                        execResult.verdict === 'Compile Error' || execResult.testResults?.some(t => t.status === 'Compile Error')
                          ? 'Compilation Error'
                          : 'Runtime Error Diagnostics'
                      }
                    />
                  )}

                  {execResult.type === 'submit' && execResult.verdict !== 'Compile Error' && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      background: execResult.verdict === 'Accepted' ? '#DCFCE7' : '#FEE2E2',
                      color: execResult.verdict === 'Accepted' ? '#15803D' : '#B91C1C',
                      fontWeight: 700,
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: `1px solid ${execResult.verdict === 'Accepted' ? '#86EFAC' : '#FCA5A5'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {execResult.verdict === 'Accepted' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                        <span>Verdict: {execResult.verdict}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        Score: {execResult.score !== undefined ? execResult.score : 0} pts &bull; {execResult.passedTests || 0} / {execResult.totalTests || 0} Test Cases Passed
                      </div>
                    </div>
                  )}

                  {execResult.testResults && execResult.testResults.length > 0 && !execResult.testResults.every(t => t.status === 'Compile Error') && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <table className="data-table" style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                        <thead>
                          <tr>
                            <th>Test Case</th>
                            <th>Status</th>
                            <th>Actual Output</th>
                            <th>Expected Output</th>
                            <th>Runtime</th>
                          </tr>
                        </thead>
                        <tbody>
                          {execResult.testResults.map((tr, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>#{tr.testCaseIndex || i + 1}</td>
                              <td style={{ fontWeight: 700, color: tr.status === 'Passed' || tr.status === 'Accepted' ? '#15803D' : '#DC2626' }}>
                                {tr.status}
                              </td>
                              <td className="font-mono" style={{ fontSize: '0.8rem' }}>{tr.actualOutput || tr.stdout || '(empty)'}</td>
                              <td className="font-mono" style={{ fontSize: '0.8rem' }}>{tr.expectedOutput || '-'}</td>
                              <td className="font-mono" style={{ fontSize: '0.8rem' }}>{tr.executionTime || 0}ms</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--text-slate)', fontSize: '0.85rem' }}>Run or Submit your solution to see test verdicts.</div>
              )}
            </div>
          )}
        </div>
      </div>

      <ResetCodeModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onConfirm={handleResetCode}
      />

      {/* Contest Fullscreen Barrier Modal */}
      {contestMode && firstEntryModalOpen && !isFullscreen && !contestCompleted && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(8px)',
          zIndex: 9990,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="glass-card" style={{
            maxWidth: '540px',
            width: '100%',
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '2px solid var(--accent-blue)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#EFF6FF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem'
            }}>
              <Maximize size={32} color="var(--accent-blue)" />
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-ink)', margin: '0 0 0.5rem' }}>
              Fullscreen Mode Required
            </h2>

            <p style={{ color: 'var(--text-slate)', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
              To ensure contest integrity, all candidates must remain in <strong>Fullscreen Mode</strong> throughout the contest session.
            </p>

            <div style={{
              background: '#F8FAFC',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '1rem',
              textAlign: 'left',
              marginBottom: '1.5rem',
              fontSize: '0.86rem',
              color: 'var(--text-slate)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#DC2626', fontWeight: 700, marginBottom: '0.4rem' }}>
                <ShieldAlert size={16} /> Proctoring Rules:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.6 }}>
                <li>Exiting Fullscreen counts as a <strong>tab blur / integrity violation</strong>.</li>
                <li>Switching to other tabs or applications will trigger a violation.</li>
                <li><strong>Maximum Allowed Violations: 2</strong> (Reaching 2 violations results in immediate disqualification).</li>
              </ul>
            </div>

            <button
              className="btn btn-primary"
              onClick={enterFullscreen}
              style={{
                width: '100%',
                padding: '0.85rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                borderRadius: '8px'
              }}
            >
              <Maximize size={18} /> Enter Fullscreen & Begin Contest
            </button>
          </div>
        </div>
      )}

      {/* First Violation Proctoring Warning Modal with Big Circular 15s Countdown */}
      {contestMode && warningModalOpen && blurCount === 1 && !contestCompleted && (
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
              PROCTORING WARNING • VIOLATION 1 OF 2
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#DC2626', margin: '0 0 0.6rem' }}>
              Fullscreen Violation Detected
            </h2>

            <p style={{ color: 'var(--text-ink)', fontSize: '0.94rem', lineHeight: 1.55, margin: '0 0 1.25rem' }}>
              You have navigated away or exited Fullscreen mode. <strong>You must return to Fullscreen mode immediately.</strong>
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
              <strong>⚠️ CRITICAL RULE:</strong> You have been logged with <strong>1 attempted violation</strong>. If you switch windows or exit fullscreen <strong>one more time (2/2)</strong>, your session will be locked out and disqualified.
            </div>

            <button
              className="btn btn-primary"
              onClick={enterFullscreen}
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

      {/* Finish Contest Confirmation Modal */}
      {finishModalState === 'confirm' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          userSelect: 'none'
        }}>
          <div className="glass-card" style={{
            maxWidth: '520px',
            width: '100%',
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '2.5rem 2.25rem',
            textAlign: 'center',
            boxShadow: '0 25px 60px -15px rgba(220, 38, 38, 0.3)',
            border: '2px solid #EF4444'
          }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
              boxShadow: '0 0 20px rgba(220, 38, 38, 0.25)'
            }}>
              <CheckCircle size={38} />
            </div>

            <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.5rem' }}>
              Finish & Submit Contest?
            </h3>

            <p style={{ color: '#475569', fontSize: '0.94rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
              Are you sure you want to conclude and submit your contest solutions now? Your code will be finalized and your attempt will be submitted for scoring.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setFinishModalState(null)}
                disabled={isFinishingContest}
                style={{
                  padding: '0.7rem 1.4rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#334155'
                }}
              >
                Cancel & Continue Solving
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  setFinishModalState(null);
                  handleManualFinish();
                }}
                disabled={isFinishingContest}
                style={{
                  padding: '0.7rem 1.4rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: '1px solid #DC2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)'
                }}
              >
                {isFinishingContest ? 'Submitting...' : 'Yes, Finish Contest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
