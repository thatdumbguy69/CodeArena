import React from 'react';
import { X, Bell, ShieldAlert, Trophy, AlertTriangle, CheckCircle, Clock, Trash2, UserX, ExternalLink } from 'lucide-react';

export const AdminNotificationDrawer = ({
  isOpen,
  onClose,
  notifications = [],
  onClearAll,
  onNavigateSection
}) => {
  if (!isOpen) return null;

  const formatTimeAgo = (dateInput) => {
    if (!dateInput) return 'Just now';
    const now = new Date();
    const date = new Date(dateInput);
    const diffSecs = Math.max(0, Math.floor((now - date) / 1000));
    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getIcon = (item) => {
    if (item.type === 'disqualification' || item.severity === 'danger') {
      return <UserX size={18} color="#DC2626" />;
    }
    if (item.type === 'violation' || item.severity === 'warning') {
      return <AlertTriangle size={18} color="#D97706" />;
    }
    if (item.type === 'contest') {
      return <Trophy size={18} color="#2563EB" />;
    }
    if (item.type === 'system' || item.severity === 'success') {
      return <CheckCircle size={18} color="#16A34A" />;
    }
    return <ShieldAlert size={18} color="var(--accent-blue)" />;
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 9998
        }}
      />
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '380px',
        maxWidth: '90vw',
        background: '#FFFFFF',
        borderLeft: '1px solid var(--border-color)',
        boxShadow: '-12px 0 30px rgba(0, 0, 0, 0.15)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.15rem 1.4rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(37, 99, 235, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bell size={18} color="#2563EB" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)', lineHeight: 1.2 }}>
                Live Notifications
              </h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {notifications.length} real-time alert{notifications.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {notifications.length > 0 && onClearAll && (
              <button
                onClick={onClearAll}
                title="Clear all notifications"
                style={{
                  border: 'none',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#DC2626',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Trash2 size={12} /> Clear
              </button>
            )}
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifications.length === 0 ? (
            <div style={{
              padding: '3rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--bg-paper)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle size={28} color="#16A34A" />
              </div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-ink)' }}>
                All Clear!
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '220px', lineHeight: 1.4 }}>
                No active integrity violations or disqualifications right now.
              </p>
            </div>
          ) : (
            notifications.map(item => {
              const isDisq = item.type === 'disqualification' || item.severity === 'danger';
              return (
                <div
                  key={item.id || item.timestamp}
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: '10px',
                    border: isDisq ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border-color)',
                    background: isDisq 
                      ? 'linear-gradient(135deg, rgba(254, 242, 242, 0.95), rgba(254, 226, 226, 0.7))'
                      : (item.severity === 'warning' ? 'rgba(254, 243, 199, 0.5)' : 'var(--bg-paper)'),
                    boxShadow: isDisq ? '0 4px 12px rgba(239, 68, 68, 0.08)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      {getIcon(item)}
                      <span style={{
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        color: isDisq ? '#B91C1C' : (item.severity === 'warning' ? '#B45309' : 'var(--text-ink)')
                      }}>
                        {item.title}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                      {formatTimeAgo(item.timestamp)}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: isDisq ? '#7F1D1D' : 'var(--text-secondary)', margin: 0, lineHeight: 1.45, fontWeight: isDisq ? 500 : 400 }}>
                    {item.message}
                  </p>

                  {item.studentName && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '0.2rem',
                      paddingTop: '0.35rem',
                      borderTop: isDisq ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(0,0,0,0.05)',
                      fontSize: '0.72rem'
                    }}>
                      <span style={{ color: isDisq ? '#991B1B' : 'var(--text-secondary)', fontWeight: 600 }}>
                        Candidate: {item.studentName} {item.teamName ? `(${item.teamName})` : ''}
                      </span>
                      {onNavigateSection && (
                        <button
                          onClick={() => {
                            onNavigateSection('live-proctoring');
                            onClose();
                          }}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#2563EB',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '0 2px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            fontSize: '0.72rem'
                          }}
                        >
                          View <ExternalLink size={10} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};
