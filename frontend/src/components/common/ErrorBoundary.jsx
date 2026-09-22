import React from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'linear-gradient(135deg, #FEF2F2 0%, #FFF1F2 50%, #F8FAFC 100%)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          color: '#0F172A',
          fontFamily: 'IBM Plex Sans, sans-serif'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            background: '#FFFFFF',
            border: '1px solid #FECACA',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#FEE2E2',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem'
            }}>
              <AlertTriangle size={36} color="#DC2626" />
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#0F172A' }}>
              Workspace Render Interrupted
            </h2>

            <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
              A temporary display error occurred while rendering the workspace. Your code and session progress are preserved in session storage.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={this.handleReset}
                style={{
                  background: '#2563EB',
                  borderColor: '#2563EB',
                  color: '#FFFFFF',
                  padding: '0.7rem 1.4rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                }}
              >
                <RefreshCw size={15} /> Reload Workspace
              </button>
              {this.props.onBack && (
                <button
                  className="btn btn-secondary"
                  onClick={this.props.onBack}
                  style={{
                    background: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    color: '#334155',
                    padding: '0.7rem 1.4rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <ArrowLeft size={15} /> Back to Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
