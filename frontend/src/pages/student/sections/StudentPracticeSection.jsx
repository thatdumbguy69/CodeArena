import React, { useState, useMemo } from 'react';
import { Search, Filter, BookOpen, CheckCircle, Clock, ArrowRight, Check, Play, X, RotateCcw } from 'lucide-react';

export const StudentPracticeSection = ({
  questions = [],
  userSubmissions = [],
  onSelectProblem
}) => {
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Build solved and attempted lookup sets supporting all ID/slug/object variations
  const { userSolvedKeys, userAttemptedKeys } = useMemo(() => {
    const solved = new Set();
    const attempted = new Set();

    (userSubmissions || []).forEach(sub => {
      if (!sub) return;
      const isAccepted = sub.verdict === 'Accepted' || sub.status === 'Accepted';

      const keys = [];
      if (typeof sub.question === 'object' && sub.question !== null) {
        if (sub.question._id) keys.push(String(sub.question._id).toLowerCase());
        if (sub.question.id) keys.push(String(sub.question.id).toLowerCase());
        if (sub.question.slug) keys.push(String(sub.question.slug).toLowerCase());
        if (sub.question.title) keys.push(String(sub.question.title).trim().toLowerCase());
      } else if (sub.question) {
        keys.push(String(sub.question).toLowerCase());
      }

      if (sub.questionSlug) keys.push(String(sub.questionSlug).toLowerCase());
      if (sub.questionId) keys.push(String(sub.questionId).toLowerCase());
      if (sub.questionTitle) keys.push(String(sub.questionTitle).trim().toLowerCase());

      keys.forEach(k => {
        attempted.add(k);
        if (isAccepted) {
          solved.add(k);
        }
      });
    });

    return { userSolvedKeys: solved, userAttemptedKeys: attempted };
  }, [userSubmissions]);

  // Helper to determine question solved / attempted status
  const checkQuestionStatus = (q) => {
    if (!q) return { isSolved: false, isAttempted: false };
    const keys = [];
    if (q._id) keys.push(String(q._id).toLowerCase());
    if (q.id) keys.push(String(q.id).toLowerCase());
    if (q.slug) keys.push(String(q.slug).toLowerCase());
    if (q.title) keys.push(String(q.title).trim().toLowerCase());

    const isSolved = keys.some(k => userSolvedKeys.has(k));
    const isAttempted = keys.some(k => userAttemptedKeys.has(k));
    return { isSolved, isAttempted };
  };

  // Derive all unique categories dynamically
  const categoriesList = useMemo(() => {
    const cats = new Set();
    (questions || []).forEach(q => {
      if (q && q.category && typeof q.category === 'string' && q.category.trim()) {
        cats.add(q.category.trim());
      }
    });
    return Array.from(cats).sort();
  }, [questions]);

  // Multi-criteria filtering
  const filteredQuestions = useMemo(() => {
    const trimmedSearch = search.trim().toLowerCase();
    const searchTokens = trimmedSearch ? trimmedSearch.split(/\s+/).filter(Boolean) : [];

    return (questions || []).filter(q => {
      if (!q) return false;

      // 1. Difficulty filter (case-insensitive with fallback)
      if (difficultyFilter !== 'All') {
        const qDiff = (q.difficulty || 'Medium').toLowerCase();
        if (qDiff !== difficultyFilter.toLowerCase()) return false;
      }

      // 2. Category filter
      if (categoryFilter !== 'All') {
        const qCat = (q.category || 'Algorithms').toLowerCase();
        if (qCat !== categoryFilter.toLowerCase()) return false;
      }

      // 3. Status filter
      const { isSolved, isAttempted } = checkQuestionStatus(q);
      if (statusFilter === 'Solved' && !isSolved) return false;
      if (statusFilter === 'Attempted' && (!isAttempted || isSolved)) return false;
      if (statusFilter === 'Unsolved' && isSolved) return false;

      // 4. Search query (matches title, slug, category, difficulty, tags)
      if (searchTokens.length > 0) {
        const titleStr = String(q.title || '').toLowerCase();
        const slugStr = String(q.slug || '').toLowerCase();
        const catStr = String(q.category || '').toLowerCase();
        const diffStr = String(q.difficulty || '').toLowerCase();
        const tagsStr = Array.isArray(q.tags)
          ? q.tags.map(t => String(t || '').toLowerCase()).join(' ')
          : String(q.tags || '').toLowerCase();

        const combinedText = `${titleStr} ${slugStr} ${catStr} ${diffStr} ${tagsStr}`;
        const matchesAllTokens = searchTokens.every(token => combinedText.includes(token));
        if (!matchesAllTokens) return false;
      }

      return true;
    });
  }, [questions, search, difficultyFilter, categoryFilter, statusFilter, userSolvedKeys, userAttemptedKeys]);

  // Overall practice statistics
  const stats = useMemo(() => {
    let solvedCount = 0;
    let attemptedCount = 0;
    (questions || []).forEach(q => {
      const { isSolved, isAttempted } = checkQuestionStatus(q);
      if (isSolved) solvedCount++;
      else if (isAttempted) attemptedCount++;
    });
    return {
      total: (questions || []).length,
      solved: solvedCount,
      attempted: attemptedCount,
      unsolved: Math.max(0, (questions || []).length - solvedCount)
    };
  }, [questions, userSolvedKeys, userAttemptedKeys]);

  const hasActiveFilters = search || difficultyFilter !== 'All' || statusFilter !== 'All' || categoryFilter !== 'All';

  const handleResetFilters = () => {
    setSearch('');
    setDifficultyFilter('All');
    setStatusFilter('All');
    setCategoryFilter('All');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header with Stats Counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
            Practice Problem Library
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-slate)' }}>
            Solve practice problems across 5 programming languages with real-time Judge0 evaluation.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{
            padding: '0.35rem 0.75rem',
            background: '#F1F5F9',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text-ink)'
          }}>
            Total: <strong>{stats.total}</strong>
          </span>
          <span style={{
            padding: '0.35rem 0.75rem',
            background: '#DCFCE7',
            border: '1px solid #BBF7D0',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#15803D'
          }}>
            ✓ Solved: <strong>{stats.solved}</strong>
          </span>
          <span style={{
            padding: '0.35rem 0.75rem',
            background: '#FEF3C7',
            border: '1px solid #FDE68A',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#D97706'
          }}>
            ● Attempted: <strong>{stats.attempted}</strong>
          </span>
        </div>
      </div>

      {/* Multi-Filter Search Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search Input */}
        <div style={{ flex: 1, position: 'relative', minWidth: '220px' }}>
          <Search size={16} color="var(--text-slate)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, slug, tag, or topic (e.g. Arrays, Trees)..."
            style={{
              width: '100%',
              padding: search ? '0.55rem 2rem 0.55rem 2.25rem' : '0.55rem 0.75rem 0.55rem 2.25rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              outline: 'none',
              fontSize: '0.86rem'
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '0.65rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-slate)',
                padding: '0.2rem',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Difficulty Dropdown */}
          <select
            value={difficultyFilter}
            onChange={e => setDifficultyFilter(e.target.value)}
            style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#FFF', fontSize: '0.85rem' }}
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#FFF', fontSize: '0.85rem' }}
          >
            <option value="All">All Statuses</option>
            <option value="Solved">✓ Solved</option>
            <option value="Attempted">● Attempted</option>
            <option value="Unsolved">○ Unsolved</option>
          </select>

          {/* Category Dropdown */}
          {categoriesList.length > 0 && (
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#FFF', fontSize: '0.85rem' }}
            >
              <option value="All">All Categories</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.82rem',
                padding: '0.55rem 0.75rem',
                color: '#DC2626',
                borderColor: '#FCA5A5'
              }}
              title="Reset all active filters"
            >
              <RotateCcw size={13} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Filter Results Counter */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-slate)', padding: '0 0.25rem' }}>
          <span>
            Showing <strong>{filteredQuestions.length}</strong> of <strong>{questions.length}</strong> problems
          </span>
          <button
            onClick={handleResetFilters}
            style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '0.82rem', textDecoration: 'underline' }}
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Problem Library Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-paper)' }}>
              <th style={{ padding: '0.85rem 1.25rem', width: '60px' }}>Status</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Problem Title</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Difficulty</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Acceptance</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Tags</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Points</th>
              <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuestions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-slate)' }}>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-ink)' }}>
                    No problems match your filter criteria.
                  </p>
                  <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.84rem' }}>
                    Try adjusting your search query, difficulty, or category filter to discover more problems.
                  </p>
                  {hasActiveFilters && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleResetFilters}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <RotateCcw size={14} /> Clear All Filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredQuestions.map((q, idx) => {
                const { isSolved, isAttempted } = checkQuestionStatus(q);

                return (
                  <tr key={q._id || q.id || q.slug || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                      {isSolved ? (
                        <span title="Solved" style={{ color: '#15803D', fontWeight: 800, fontSize: '1rem' }}>✓</span>
                      ) : isAttempted ? (
                        <span title="Attempted" style={{ color: '#D97706', fontWeight: 800, fontSize: '1rem' }}>●</span>
                      ) : (
                        <span title="Unsolved" style={{ color: 'var(--text-slate)', fontSize: '1rem' }}>○</span>
                      )}
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: 'var(--text-ink)' }}>
                      <span
                        onClick={() => onSelectProblem(q.slug || q._id)}
                        style={{ cursor: 'pointer', color: 'var(--text-ink)', textDecoration: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                      >
                        {q.title}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: (q.difficulty || 'Medium') === 'Easy' ? '#DCFCE7' : ((q.difficulty || 'Medium') === 'Medium' ? '#FEF3C7' : '#FEE2E2'),
                        color: (q.difficulty || 'Medium') === 'Easy' ? '#15803D' : ((q.difficulty || 'Medium') === 'Medium' ? '#D97706' : '#B91C1C')
                      }}>
                        {q.difficulty || 'Medium'}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.85rem' }}>
                      {q.acceptanceRate ? `${q.acceptanceRate}%` : '85%'}
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-slate)' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {Array.isArray(q.tags) && q.tags.length > 0 ? (
                          q.tags.slice(0, 3).map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              onClick={() => setSearch(String(tag))}
                              title={`Filter by tag: ${tag}`}
                              style={{
                                cursor: 'pointer',
                                background: 'var(--bg-paper)',
                                border: '1px solid var(--border-color)',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                color: 'var(--text-slate)'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = 'var(--accent-blue)';
                                e.currentTarget.style.color = 'var(--accent-blue)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                e.currentTarget.style.color = 'var(--text-slate)';
                              }}
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span>{q.category || 'General'}</span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                      {q.points || 100} pts
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onSelectProblem(q.slug || q._id)}
                      >
                        {isSolved ? 'Solve Again' : (isAttempted ? 'Try Again' : 'Solve Problem')}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
