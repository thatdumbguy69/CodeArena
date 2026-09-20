import React from 'react';
import { UserX, Bell, X, ExternalLink } from 'lucide-react';

export const AdminPushToast = ({ toasts = [], onDismiss, onAction }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '1.25rem',
      right: '1.25rem',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      maxWidth: '420px',
      width: 'calc(100vw - 2.5rem)',
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => {
        const isDisq = toast.type === 'disqualification' || toast.severity === 'danger';

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: isDisq
                ? 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 50%, #B91C1C 100%)'
                : 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
              color: '#FFFFFF',
              borderRadius: '12px',
              padding: '1rem 1.15rem',
              boxShadow: isDisq
                ? '0 12px 30px rgba(220, 38, 38, 0.45), 0 4px 10px rgba(0, 0, 0, 0.2)'
                : '0 12px 25px rgba(15, 23, 42, 0.35)',
              border: isDisq ? '1px solid rgba(254, 202, 202, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Top Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: isDisq ? 'rgba(255, 255, 255, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isDisq ? <UserX size={16} color="#FFFFFF" /> : <Bell size={16} color="#60A5FA" />}
                </div>
                <div>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isDisq ? '#FECACA' : '#93C5FD'
                  }}>
                    {isDisq ? '🚨 Live Disqualification Alert' : (toast.title || 'Live System Alert')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onDismiss(toast.id)}
                style={{
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Message Body */}
            <div>
              <h4 style={{
                margin: '0 0 0.25rem 0',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#FFFFFF'
              }}>
                {toast.studentName ? `${toast.studentName} ${toast.teamName ? `(${toast.teamName})` : ''}` : toast.title}
              </h4>
              <p style={{
                margin: 0,
                fontSize: '0.82rem',
                color: isDisq ? 'rgba(254, 226, 226, 0.95)' : '#E2E8F0',
                lineHeight: 1.45
              }}>
                {toast.message}
              </p>
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '0.2rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.15)'
            }}>
              <span style={{ fontSize: '0.7rem', color: isDisq ? 'rgba(254, 202, 202, 0.8)' : '#94A3B8' }}>
                {toast.email ? `Email: ${toast.email}` : 'Live Proctoring Alert'}
              </span>

              {onAction && (
                <button
                  onClick={() => {
                    onAction(toast);
                    onDismiss(toast.id);
                  }}
                  style={{
                    border: 'none',
                    background: '#FFFFFF',
                    color: isDisq ? '#991B1B' : '#0F172A',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }}
                >
                  Inspect Participant <ExternalLink size={12} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};