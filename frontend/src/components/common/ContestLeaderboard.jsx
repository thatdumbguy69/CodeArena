import React, { useState } from 'react';
import { Search, ChevronDown, CheckCircle, XCircle, Clock, Trophy } from 'lucide-react';

/**
 * ContestLeaderboard Component
 * 
 * Props:
 * - data: Array of leaderboard items [{ rank, teamName, name, score, solvedCount, problemTimes, totalTimeFormatted, ... }]
 * - title: Title string (defaults to "Contest Leaderboard")
 * - subtitle: Subtitle string (defaults to "Code • Compete • Learn • Grow")
 * - isLive: Boolean (shows green 'Live' indicator)
 * - lastUpdated: String or Date
 * - currentUserId: String / Number (highlights current logged-in user row)
 * - currentUserEmail: String
 * - onSearchChange: Optional external search handler if parent manages search
 * - searchVal: Optional external search string
 * - loading: Boolean
 * - emptyMessage: String
 */
export const ContestLeaderboard = ({
  data = [],
  title = "Contest Leaderboard",
  subtitle = "Code • Compete • Learn • Grow",
  isLive = false,
  lastUpdated,
  currentUserId,
  currentUserEmail,
  onSearchChange,
  searchVal,
  loading = false,
  emptyMessage = "No leaderboard rankings recorded yet.",
  contestId = null,
  onViewSubmissions = null
}) => {
  const [internalSearch, setInternalSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState({});

  const search = searchVal !== undefined ? searchVal : internalSearch;
  const handleSearchChange = (val) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalSearch(val);
    }
  };

  const toggleRow = (idOrIndex) => {
    setExpandedRows(prev => ({
      ...prev,
      [idOrIndex]: !prev[idOrIndex]
    }));
  };

  // Filter rankings based on search query
  const filteredData = data.filter(r => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (r.teamName && r.teamName.toLowerCase().includes(term)) ||
      (r.name && r.name.toLowerCase().includes(term)) ||
      (r.email && r.email.toLowerCase().includes(term))
    );
  });

  const formattedLastUpdated = lastUpdated || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getRankBadge = (rank) => {
    const r = Number(rank);
    let bg = '#F3F4F6';
    let color = '#4B5563';
    let border = '#E5E7EB';

    if (r === 1) {
      bg = '#FEF3C7';
      color = '#B45309';
      border = '#FCD34D';
    } else if (r === 2) {
      bg = '#F1F5F9';
      color = '#475569';
      border = '#CBD5E1';
    } else if (r === 3) {
      bg = '#FFEDD5';
      color = '#C2410C';
      border = '#FDBA74';
    }

    return (
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: bg,
        color: color,
        border: `1px solid ${border}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '0.8rem',
        boxShadow: r <= 3 ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
      }}>
        #{r}
      </div>
    );
  };

  return (
    <div className="contest-leaderboard-container" style={{
      background: '#FFFFFF',
      borderRadius: '10px',
      border: '1px solid #E5E7EB',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Container Header Bar */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid #F3F4F6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        background: '#FAFAFA'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <Trophy size={20} color="#2563EB" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#111827', letterSpacing: '-0.01em' }}>
              {title}
            </h3>
            {isLive && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#166534',
                background: '#DCFCE7',
                border: '1px solid #86EFAC',
                padding: '0.15rem 0.5rem',
                borderRadius: '12px'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#22C55E',
                  boxShadow: '0 0 6px #22C55E'
                }}></span>
                Live
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 500 }}>
              {subtitle}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>•</span>
            <span style={{ fontSize: '0.78rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={12} />
              Last updated: {formattedLastUpdated}
            </span>
          </div>
        </div>

        {/* Search Input Box */}
        <div style={{ position: 'relative', minWidth: '240px', flex: '0 1 300px' }}>
          <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search participant or team..."
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2.25rem',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              fontSize: '0.85rem',
              outline: 'none',
              background: '#FFFFFF',
              color: '#111827',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
          />
        </div>
      </div>

      {/* Leaderboard Responsive Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '0.85rem 1.25rem', width: '70px', textAlign: 'center' }}>Rank</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Team / Group Name</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Participant Name</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Email ID</th>
              <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Score</th>
              <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Solved Count</th>
              <th className="hide-mobile" style={{ padding: '0.85rem 1.25rem' }}>Time per Problem</th>
              <th className="hide-mobile" style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Total Time Taken</th>
              <th style={{ padding: '0.85rem 1.25rem', width: '110px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#6B7280' }}>
                  <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #E5E7EB', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }}></div>
                  <div>Loading leaderboard rankings...</div>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#6B7280' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredData.map((row, idx) => {
                const rankNum = row.rank || idx + 1;
                const rowKey = row.id || row._id || row.email || idx;
                const isExpanded = !!expandedRows[rowKey];
                const isCurrentUser = (currentUserId && String(row.id || row._id) === String(currentUserId)) || (currentUserEmail && row.email === currentUserEmail);
                const problemTimes = row.problemTimes || [];

                return (
                  <React.Fragment key={rowKey}>
                    <tr style={{
                      borderBottom: isExpanded ? 'none' : '1px solid #F3F4F6',
                      background: isCurrentUser ? '#EFF6FF' : (isExpanded ? '#F9FAFB' : '#FFFFFF'),
                      transition: 'background-color 0.15s ease'
                    }}>
                      {/* Rank */}
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                        {getRankBadge(rankNum)}
                      </td>

                      {/* Team / Group Name */}
                      <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: '#111827' }}>
                        {row.teamName || row.name || 'Team'}
                      </td>

                      {/* Participant Name */}
                      <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: '#374151' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{row.name || 'Participant'}</span>
                          {isCurrentUser && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '4px', background: '#DBEAFE', color: '#1E40AF' }}>
                              YOU
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Email ID */}
                      <td style={{ padding: '0.85rem 1.25rem', color: '#4B5563', fontSize: '0.82rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {row.email || 'N/A'}
                      </td>

                      {/* Score */}
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right', fontWeight: 800, color: '#2563EB', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                        {row.score ?? 0} pts
                      </td>

                      {/* Solved Count */}
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center', fontWeight: 700, color: '#166534' }}>
                        <span style={{ background: '#DCFCE7', padding: '0.2rem 0.55rem', borderRadius: '12px', fontSize: '0.8rem' }}>
                          {row.solvedCount ?? 0}
                        </span>
                      </td>

                      {/* Time per Problem (Summary chip preview on desktop) */}
                      <td className="hide-mobile" style={{ padding: '0.85rem 1.25rem', fontSize: '0.8rem' }}>
                        {problemTimes.length > 0 ? (
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {problemTimes.slice(0, 3).map((pt, i) => (
                              <span key={i} style={{ background: '#F3F4F6', color: '#4B5563', padding: '0.15rem 0.45rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                {pt.title ? `${pt.title.substring(0, 8)}: ` : ''}{pt.formatted}
                              </span>
                            ))}
                            {problemTimes.length > 3 && (
                              <span style={{ color: '#9CA3AF', fontSize: '0.75rem', alignSelf: 'center' }}>+{problemTimes.length - 3} more</span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>{row.problemTimesFormatted || 'None'}</span>
                        )}
                      </td>

                      {/* Total Time Taken */}
                      <td className="hide-mobile" style={{ padding: '0.85rem 1.25rem', textAlign: 'right', fontWeight: 700, color: '#374151', fontFamily: 'monospace' }}>
                        {row.totalTimeFormatted || 'N/A'}
                      </td>

                      {/* Action Expand Button */}
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                        <button
                          onClick={() => toggleRow(rowKey)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '6px',
                            border: `1px solid ${isExpanded ? '#93C5FD' : '#DBEAFE'}`,
                            background: isExpanded ? '#EFF6FF' : '#FFFFFF',
                            color: '#2563EB',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Expand
                          <div style={{
                            display: 'inline-flex',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.25s ease'
                          }}>
                            <ChevronDown size={14} />
                          </div>
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Problem Breakdown Drawer */}
                    {isExpanded && (
                      <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                        <td colSpan={9} style={{ padding: '1rem 1.5rem 1.25rem 3.5rem' }}>
                          <div style={{
                            background: '#FFFFFF',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB',
                            padding: '1rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                Problem Performance Breakdown — {row.name} ({row.teamName || 'Team'})
                              </h4>
                              <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                                Total Time: <strong style={{ color: '#111827', fontFamily: 'monospace' }}>{row.totalTimeFormatted || 'N/A'}</strong>
                              </div>
                            </div>

                            {problemTimes.length === 0 ? (
                              <div style={{ fontSize: '0.82rem', color: '#9CA3AF', fontStyle: 'italic', padding: '0.5rem 0' }}>
                                Detailed per-problem timing is not available for this participant.
                              </div>
                            ) : (
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid #F3F4F6', color: '#6B7280', textAlign: 'left' }}>
                                    <th style={{ padding: '0.4rem 0.6rem' }}>Problem Name</th>
                                    <th style={{ padding: '0.4rem 0.6rem' }}>Status</th>
                                    <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>Score / Points</th>
                                    <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>Time Taken</th>
                                    {onViewSubmissions && (
                                      <th style={{ padding: '0.4rem 0.6rem', textAlign: 'center', width: '130px' }}>Action</th>
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {problemTimes.map((pt, pIdx) => {
                                    const isSolved = pt.isSolved !== undefined
                                      ? pt.isSolved
                                      : (pt.score > 0 || pt.verdict === 'Accepted');

                                    return (
                                      <tr key={pIdx} style={{ borderBottom: pIdx === problemTimes.length - 1 ? 'none' : '1px solid #F9FAFB' }}>
                                        <td style={{ padding: '0.5rem 0.6rem', fontWeight: 600, color: '#111827' }}>
                                          <span>{pt.title || `Problem ${pIdx + 1}`}</span>
                                        </td>
                                        <td style={{ padding: '0.5rem 0.6rem' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                            {isSolved ? (
                                              <span style={{ color: '#166534', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <CheckCircle size={13} color="#166534" /> Solved
                                              </span>
                                            ) : (
                                              <span style={{ color: '#DC2626', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <XCircle size={13} color="#DC2626" /> {pt.verdict && pt.verdict !== 'Unattempted' ? pt.verdict : 'Not Solved'}
                                              </span>
                                            )}
                                            {pt.language && (
                                              <span style={{
                                                padding: '0.1rem 0.4rem',
                                                borderRadius: '4px',
                                                background: '#F1F5F9',
                                                border: '1px solid #E2E8F0',
                                                color: '#475569',
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.3px',
                                                fontFamily: 'monospace'
                                              }}>
                                                {pt.language}
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', fontWeight: 700, color: '#2563EB' }}>
                                          {pt.score !== undefined ? `${pt.score} pts` : '0 pts'}
                                        </td>
                                        <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#374151' }}>
                                          {pt.formatted || (pt.seconds !== null && pt.seconds !== undefined ? `${pt.seconds}s` : 'N/A')}
                                        </td>
                                        {onViewSubmissions && (
                                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                                            <button
                                              type="button"
                                              onClick={() => onViewSubmissions(contestId || row.contestId, pt.qId || pt._id, row.id || row._id)}
                                              style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                padding: '0.2rem 0.55rem',
                                                borderRadius: '4px',
                                                border: '1px solid #BFDBFE',
                                                background: '#EFF6FF',
                                                color: '#1D4ED8',
                                                fontSize: '0.74rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                              }}
                                              title="View submissions for this problem / contest"
                                            >
                                              View Submission
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default ContestLeaderboard;
