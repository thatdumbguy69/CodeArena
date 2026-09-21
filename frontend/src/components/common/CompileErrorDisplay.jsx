import React, { useState } from 'react';
import { AlertTriangle, Copy, Check, Terminal, Lightbulb } from 'lucide-react';

export const CompileErrorDisplay = ({ error, language = 'cpp', title = 'Compilation Error' }) => {
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const rawError = typeof error === 'string' ? error : (error.message || JSON.stringify(error, null, 2));

  // Clean internal server temp file paths to user-friendly source filenames
  const cleanErrorText = (text) => {
    if (!text) return '';
    return text
      .replace(/[A-Za-z]:\\[^ \n\r\t:]*codearena_[^ \n\r\t:]*\.(cpp|c|java|py|js)/gi, (match, ext) => `solution.${ext}`)
      .replace(/\/tmp\/codearena_[^ \n\r\t:]*\.(cpp|c|java|py|js)/gi, (match, ext) => `solution.${ext}`)
      .replace(/[A-Za-z]:\\[^ \n\r\t:]*\\([A-Za-z0-9_]+\.java)/gi, '$1')
      .replace(/[A-Za-z]:\\[^ \n\r\t:]*\\/g, '')
      .replace(/Java HotSpot\(TM\)[^\n]*/gi, '')
      .replace(/Picked up _JAVA_OPTIONS[^\n]*/gi, '')
      .trim();
  };

  const formattedError = cleanErrorText(rawError);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedError);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate smart actionable debugging tips based on compiler diagnostics
  const getSmartHints = (msg) => {
    const hints = [];
    const lower = msg.toLowerCase();

    if (lower.includes('expected \';\'') || lower.includes('\';\' expected') || lower.includes('missing semicolon')) {
      hints.push('Check for a missing semicolon (;) at the end of the specified line or the line right above it.');
    }
    if (lower.includes('was not declared in this scope') || lower.includes('cannot find symbol') || lower.includes('nameerror')) {
      hints.push('Variable or function is undeclared. Verify variable name spelling, scope, or missing import / header.');
    }
    if (lower.includes('expected \'}\'') || lower.includes('expected \')\'') || lower.includes('unmatched') || lower.includes('syntaxerror: unexpected token')) {
      hints.push('Unbalanced brackets or parentheses. Check that all { }, ( ), and [ ] are properly opened and closed.');
    }
    if (lower.includes('class') && lower.includes('is public, should be declared in a file named')) {
      hints.push('In Java, rename your primary class to "Main" (public class Main) or remove the "public" access modifier.');
    }
    if (lower.includes('indentationerror')) {
      hints.push('Python indentation error: Ensure consistent use of 4 spaces per indentation level throughout your code.');
    }
    if (lower.includes('redefinition of') || lower.includes('already defined')) {
      hints.push('Duplicate declaration: This variable or function is defined more than once in the same scope.');
    }
    if (lower.includes('cannot convert') || lower.includes('incompatible types') || lower.includes('typeerror')) {
      hints.push('Type mismatch: Check variable types and ensure proper type casting when passing arguments or assigning values.');
    }

    return hints;
  };

  const hints = getSmartHints(formattedError);

  const getLanguageLabel = (lang) => {
    switch (String(lang).toLowerCase()) {
      case 'cpp': return 'C++17 (g++)';
      case 'c': return 'C11 (gcc)';
      case 'java': return 'Java 17 (javac)';
      case 'python':
      case 'py': return 'Python 3';
      case 'javascript':
      case 'js': return 'Node.js (V8)';
      default: return String(lang).toUpperCase();
    }
  };

  // Parse error lines to highlight compiler keywords
  const renderHighlightedLines = (text) => {
    return text.split('\n').map((line, idx) => {
      let isErrorLine = /error:|syntaxerror:|exception|traceback|fatal/i.test(line);
      let isWarningLine = /warning:|note:/i.test(line);
      let isPointerLine = /\^|~/.test(line) && line.trim().startsWith('^');

      let color = '#F8FAFC'; // Default light text
      if (isErrorLine) color = '#F87171'; // Bright red
      else if (isWarningLine) color = '#FBBF24'; // Amber
      else if (isPointerLine) color = '#38BDF8'; // Cyan pointer

      return (
        <div key={idx} style={{ color, lineHeight: '1.45', display: 'flex', gap: '0.75rem' }}>
          <span style={{ color: '#64748B', userSelect: 'none', width: '28px', textAlign: 'right', flexShrink: 0, fontSize: '0.75rem' }}>
            {idx + 1}
          </span>
          <span style={{ wordBreak: 'break-word', flex: 1 }}>{line || ' '}</span>
        </div>
      );
    });
  };

  return (
    <div style={{
      background: '#0F172A',
      borderRadius: '10px',
      border: '1px solid #DC2626',
      boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
      overflow: 'hidden',
      margin: '0.5rem 0',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Header Bar */}
      <div style={{
        background: 'linear-gradient(90deg, #450A0A 0%, #1E1B4B 100%)',
        borderBottom: '1px solid rgba(220, 38, 38, 0.4)',
        padding: '0.6rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            background: '#EF4444',
            color: '#FFFFFF',
            borderRadius: '6px',
            padding: '0.3rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)'
          }}>
            <AlertTriangle size={16} />
          </div>
          <div>
            <div style={{ color: '#FEE2E2', fontWeight: 800, fontSize: '0.88rem', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>{title}</span>
              <span style={{
                background: 'rgba(239, 68, 68, 0.25)',
                color: '#FCA5A5',
                fontSize: '0.7rem',
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                fontWeight: 700
              }}>
                BUILD FAILED
              </span>
            </div>
            <div style={{ color: '#94A3B8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
              <Terminal size={12} /> Runtime Engine: <strong style={{ color: '#E2E8F0' }}>{getLanguageLabel(language)}</strong>
            </div>
          </div>
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          style={{
            background: copied ? '#059669' : 'rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            padding: '0.35rem 0.75rem',
            fontSize: '0.76rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease'
          }}
          title="Copy compiler diagnostics to clipboard"
        >
          {copied ? <Check size={13} color="#FFFFFF" /> : <Copy size={13} />}
          <span>{copied ? 'Copied!' : 'Copy Log'}</span>
        </button>
      </div>

      {/* Terminal Monospace Output Body */}
      <div style={{
        padding: '0.85rem 1rem',
        background: '#0B0F19',
        fontFamily: "'IBM Plex Mono', 'Fira Code', 'Consolas', monospace",
        fontSize: '0.82rem',
        maxHeight: '260px',
        overflowY: 'auto',
        borderBottom: hints.length > 0 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
      }}>
        {renderHighlightedLines(formattedError)}
      </div>

      {/* Smart Hints Section */}
      {hints.length > 0 && (
        <div style={{
          background: '#1E293B',
          padding: '0.6rem 1rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.6rem',
          fontSize: '0.78rem'
        }}>
          <Lightbulb size={16} color="#FBBF24" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
          <div style={{ color: '#E2E8F0', flex: 1 }}>
            <span style={{ color: '#FCD34D', fontWeight: 700, marginRight: '0.4rem' }}>Diagnostic Tip:</span>
            {hints.map((hint, i) => (
              <span key={i}>{hint}{i < hints.length - 1 ? ' ' : ''}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompileErrorDisplay;
