import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, RefreshCw, Plus, CheckCircle, Clock } from 'lucide-react';

export const ProblemList = ({ onSelectProblem, setCurrentTab }) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [userSubmissions, setUserSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchQuestionsAndSubmissions();
  }, [difficultyFilter, categoryFilter]);

  const fetchQuestionsAndSubmissions = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (difficultyFilter !== 'All') params.difficulty = difficultyFilter;
      if (categoryFilter !== 'All') params.category = categoryFilter;

      const [qRes, subRes] = await Promise.all([
        api.get('/questions', { params }),
        user ? api.get('/submissions') : Promise.resolve({ data: { submissions: [] } })
      ]);

      setQuestions(qRes.data.questions || []);
      setUserSubmissions(subRes.data.submissions || []);
    } catch (err) {
      console.error('Error loading questions:', err);
      setError('Could not load problem catalog.');
    } finally {
      setLoading(false);
    }
  };

  const getProblemStatus = (qId, slug) => {
    if (!user || userSubmissions.length === 0) return null;
    const subs = userSubmissions.filter(s => String(s.question) === String(qId) || String(s.question) === String(slug));
    if (subs.some(s => s.verdict === 'Accepted' || s.status === 'Accepted')) {
      return <span className="badge badge-easy"><CheckCircle size={12} /> Solved</span>;
    }
    if (subs.length > 0) {
      return <span className="badge badge-medium"><Clock size={12} /> Attempted</span>;
    }
    return <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>;
  };

  const filteredQuestions = questions.filter(q => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      q.title.toLowerCase().includes(term) ||
      (q.tags || []).some(t => t.toLowerCase().includes(term)) ||
      q.category.toLowerCase().includes(term)
    );
  });

  const renderDifficultyLabel = (diff) => {
    switch (diff) {
      case 'Easy':
        return <span style={{ color: 'var(--diff-easy)', fontWeight: 600, fontSize: '0.85rem' }}>Easy</span>;
      case 'Medium':
        return <span style={{ color: 'var(--diff-medium)', fontWeight: 600, fontSize: '0.85rem' }}>Medium</span>;
      case 'Hard':
        return <span style={{ color: 'var(--diff-hard)', fontWeight: 600, fontSize: '0.85rem' }}>Hard</span>;
      default:
        return <span style={{ color: 'var(--text-slate)', fontWeight: 500, fontSize: '0.85rem' }}>{diff}</span>;
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Practice Catalog</h1>
          <p style={{ color: 'var(--text-slate)', fontSize: '0.88rem' }}>
            Select any problem to open the interactive problem arena and code runner.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {user && user.role === 'admin' && setCurrentTab && (
            <button className="btn btn-primary btn-sm" onClick={() => setCurrentTab('admin')}>
              <Plus size={14} /> Create Problem
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={fetchQuestionsAndSubmissions}>
            <RefreshCw size={14} /> Refresh Catalog
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <Search size={14} color="var(--text-slate)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search problems by title, tag, or topic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-slate)' }}>Difficulty:</label>
            <select
              className="form-select"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              style={{ width: '120px' }}
            >
              <option value="All">All</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-slate)' }}>Category:</label>
            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ width: '150px' }}
            >
              <option value="All">All Categories</option>
              <option value="Arrays">Arrays</option>
              <option value="Strings">Strings</option>
              <option value="Dynamic Programming">Dynamic Programming</option>
              <option value="Algorithms">Algorithms</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sortable High-Density Data Table */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-slate)' }}>
          Loading problem catalog...
        </div>
      ) : error ? (
        <div className="card" style={{ color: 'var(--diff-hard)', padding: '1rem' }}>{error}</div>
      ) : filteredQuestions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-slate)' }}>
          No problems found.
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th>Title</th>
              <th style={{ width: '100px' }}>Status</th>
              <th style={{ width: '110px' }}>Difficulty</th>
              <th style={{ width: '120px' }}>Acceptance</th>
              <th style={{ width: '180px' }}>Tags</th>
              <th style={{ width: '90px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuestions.map((q, idx) => (
              <tr
                key={q._id || q.slug || idx}
                onClick={() => onSelectProblem(q.slug)}
                style={{ cursor: 'pointer' }}
              >
                <td className="font-mono" style={{ color: 'var(--text-slate)', fontSize: '0.82rem' }}>{idx + 1}</td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-ink)' }}>
                    {q.title}
                  </div>
                </td>
                <td>{getProblemStatus(q._id, q.slug)}</td>
                <td>{renderDifficultyLabel(q.difficulty)}</td>
                <td className="font-mono" style={{ fontSize: '0.82rem', color: 'var(--text-slate)' }}>
                  {q.acceptanceRate || '85.4'}%
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {(q.tags || [q.category || 'Algorithms']).slice(0, 3).map((tag, tIdx) => (
                      <span key={tIdx} style={{
                        fontSize: '0.72rem',
                        background: 'var(--bg-paper)',
                        border: '1px solid var(--border-color)',
                        padding: '0.1rem 0.35rem',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-slate)'
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onSelectProblem(q.slug)}
                  >
                    Solve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
