import React from 'react';
import { X, User, ShieldAlert, CheckCircle, Clock, Award, FileCode, AlertTriangle } from 'lucide-react';

export const ParticipantDetailsModal = ({ isOpen, onClose, participant, proctorLogs = [], onDisqualify, onQualify }) => {
  if (!isOpen || !participant) return null;

  const isDisqualified = participant.isDisqualified || participant.status === 'Disqualified';
  const blurCount = participant.blurCount || participant.tabBlurCount || 0;
  const maxAllowed = participant.maxAllowedBlurs || 3;

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.5rem'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '750px',
        maxHeight: '85vh',
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          background: isDisqualified ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-paper)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--accent-blue)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700
            }}>
              {participant.name ? participant.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-ink)' }}>
                {participant.name || 'Participant Details'}
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {participant.email}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* Key Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '0.85rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ padding: '1rem', background: 'var(--bg-paper)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>Total Score</span>
              <strong style={{ fontSize: '1.3rem', color: 'var(--accent-blue)' }}>{participant.score || 0} pts</strong>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-paper)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>Problems Solved</span>
              <strong style={{ fontSize: '1.3rem', color: '#15803D' }}>{participant.solvedCount || 0}</strong>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-paper)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>Tab Blurs</span>
              <strong style={{ fontSize: '1.3rem', color: blurCount >= maxAllowed ? '#DC2626' : 'var(--text-ink)' }}>
                {blurCount} / {maxAllowed}
              </strong>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-paper)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>Integrity Status</span>
              <strong style={{
                fontSize: '0.9rem',
                color: isDisqualified ? '#DC2626' : '#15803D',
                display: 'block',
                marginTop: '0.2rem'
              }}>
                {isDisqualified ? 'DISQUALIFIED' : 'ACTIVE / NORMAL'}
              </strong>
            </div>
          </div>

          {/* Proctoring & Integrity Event Log Timeline */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-ink)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={16} color="var(--accent-blue)" />
              Integrity & Proctoring Event Timeline
            </h4>

            {proctorLogs.length === 0 ? (
              <div style={{
                padding: '1.25rem',
                textAlign: 'center',
                background: 'var(--bg-paper)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem'
              }}>
                No proctoring violations or tab blur events recorded for this candidate.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {proctorLogs.map((log, index) => (
                  <div key={index} style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: log.type === 'disqualified' ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-paper)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Clock size={14} color="var(--text-secondary)" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-ink)' }}>
                        {log.timestamp || new Date().toLocaleTimeString()}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: log.type === 'disqualified' ? '#DC2626' : 'var(--text-ink)' }}>
                        — {log.message || log.event}
                      </span>
                    </div>

                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: log.type === 'disqualified' ? '#FEE2E2' : '#FEF3C7',
                      color: log.type === 'disqualified' ? '#DC2626' : '#D97706'
                    }}>
                      {log.type === 'disqualified' ? 'DISQUALIFIED' : 'WARNING'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          background: 'var(--bg-paper)',
          borderTop: '1px solid var(--border-color)',
          gap: '1rem'
        }}>
          <div>
            {onDisqualify && !isDisqualified && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  onDisqualify(participant);
                  onClose();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 700,
                  padding: '0.45rem 0.85rem'
                }}
              >
                <AlertTriangle size={14} /> Disqualify Candidate
              </button>
            )}
            {onQualify && isDisqualified && (
              <button
                className="btn btn-sm"
                onClick={() => {
                  onQualify(participant);
                  onClose();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#DCFCE7',
                  color: '#15803D',
                  border: '1px solid #86EFAC',
                  fontWeight: 700,
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <CheckCircle size={14} /> Reinstate Candidate
              </button>
            )}
          </div>

          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
