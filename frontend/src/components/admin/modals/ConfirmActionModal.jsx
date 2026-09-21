import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const ConfirmActionModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to perform this action? This action cannot be easily undone.',
  confirmText = 'Confirm',
  danger = true,
  requireTypedConfirmation = false,
  confirmationKeyword = 'CONFIRM'
}) => {
  const [typedInput, setTypedInput] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireTypedConfirmation && typedInput.trim().toUpperCase() !== confirmationKeyword.toUpperCase()) {
      return;
    }
    onConfirm();
    setTypedInput('');
    onClose();
  };

  const isConfirmDisabled = requireTypedConfirmation && typedInput.trim().toUpperCase() !== confirmationKeyword.toUpperCase();

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
      padding: '1rem'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '480px',
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          background: danger ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-paper)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: danger ? '#FEE2E2' : '#E0E7FF',
              color: danger ? '#DC2626' : '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={20} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-ink)' }}>
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          <p style={{ margin: 0, color: 'var(--text-ink)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            {message}
          </p>

          {requireTypedConfirmation && (
            <div style={{ marginTop: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Type <strong style={{ color: '#DC2626' }}>{confirmationKeyword}</strong> to confirm:
              </label>
              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder={confirmationKeyword}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          padding: '1rem 1.5rem',
          background: 'var(--bg-paper)',
          borderTop: '1px solid var(--border-color)'
        }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn btn-sm"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            style={{
              background: danger ? '#DC2626' : 'var(--accent-blue)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 600,
              opacity: isConfirmDisabled ? 0.5 : 1,
              cursor: isConfirmDisabled ? 'not-allowed' : 'pointer'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
