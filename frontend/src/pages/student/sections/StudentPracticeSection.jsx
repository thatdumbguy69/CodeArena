import React, { useState } from 'react';
import { Search, Filter, BookOpen, CheckCircle, Clock, ArrowRight, Check, Play } from 'lucide-react';

export const StudentPracticeSection = ({
  questions = [],
  userSubmissions = [],
  onSelectProblem
}) => {
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Build solved/attempted lookup map
  const userSolvedSlugs = new Set();
  const userAttemptedSlugs = new Set();

  userSubmissions.forEach(sub => {
    const slug = sub.questionSlug || sub.question;
    if (!slug) return;
    userAttemptedSlugs.add(String(slug));
    if (sub.verdict === 'Accepted' || sub.status === 'Accepted') {
      userSolvedSlugs.add(String(slug));
    }
  });

  const filteredQuestions = questions.filter(q => {
    const qIdStr = String(q._id || q.id || q.slug);
    const matchesSearch = !search || q.title.toLowerCase().includes(search.toLowerCase()) || (q.tags && q.tags.toString().toLowerCase().includes(search.toLowerCase()));
    const matchesDiff = difficultyFilter === 'All' || q.difficulty === difficultyFilter;

    let matchesStatus = true;
    const isSolved = userSolvedSlugs.has(qIdStr) || userSolvedSlugs.has(q.slug);
    const isAttempted = userAttemptedSlugs.has(qIdStr) || userAttemptedSlugs.has(q.slug);

    if (statusFilter === 'Solved') matchesStatus = isSolved;
    if (statusFilter === 'Attempted') matchesStatus = isAttempted && !isSolved;
    if (statusFilter === 'Unsolved') matchesStatus = !isSolved;

    return matchesSearch && matchesDiff && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
          Practice Problem Library
        </h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-slate)' }}>
          Solve practice problems across 5 programming languages with real-time Judge0 evaluation.
        </span>
      </div>

      {/* Multi-Filter Search Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '220px' }}>
          <Search size={16} color="var(--text-slate)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, slug, or tag (e.g. Arrays, Trees)..."
            style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.25rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={difficultyFilter}
            onChange={e => setDifficultyFilter(e.target.value)}
            style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#FFF' }}
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#FFF' }}
          >
            <option value="All">All Statuses</option>
            <option value="Solved">✓ Solved</option>
            <option value="Attempted">● Attempted</option>
            <option value="Unsolved">○ Unsolved</option>
          </select>
        </div>
      </div>

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
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-slate)' }}>
                  No problems match your current search/filter parameters.
                </td>
              </tr>
            ) : (
              filteredQuestions.map((q, idx) => {
                const qIdStr = String(q._id || q.id || q.slug);
                const isSolved = userSolvedSlugs.has(qIdStr) || userSolvedSlugs.has(q.slug);
                const isAttempted = userAttemptedSlugs.has(qIdStr) || userAttemptedSlugs.has(q.slug);

                return (
                  <tr key={q._id || q.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                      {isSolved ? (
                        <span title="Solved" style={{ color: '#15803D', fontWeight: 800 }}>✓</span>
                      ) : isAttempted ? (
                        <span title="Attempted" style={{ color: '#D97706', fontWeight: 800 }}>●</span>
                      ) : (
                        <span title="Unsolved" style={{ color: 'var(--text-slate)' }}>○</span>
                      )}
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: 'var(--text-ink)' }}>
                      <span
                        onClick={() => onSelectProblem(q.slug || q._id)}
                        style={{ cursor: 'pointer', color: 'var(--text-ink)' }}
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
                        background: q.difficulty === 'Easy' ? '#DCFCE7' : (q.difficulty === 'Medium' ? '#FEF3C7' : '#FEE2E2'),
                        color: q.difficulty === 'Easy' ? '#15803D' : (q.difficulty === 'Medium' ? '#D97706' : '#B91C1C')
                      }}>
                        {q.difficulty || 'Medium'}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.85rem' }}>
                      {q.acceptanceRate ? `${q.acceptanceRate}%` : '85%'}
                    </td>

                    <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-slate)' }}>
                      {Array.isArray(q.tags) ? q.tags.join(', ') : (q.tags || 'General')}
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
