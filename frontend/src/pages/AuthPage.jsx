import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, AlertCircle, Shield, User, Eye, EyeOff } from 'lucide-react';

export const AuthPage = ({ onAuthSuccess }) => {
  const { login, register, loginAsAdmin, loginAsStudent } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      let authUser = null;
      if (isLogin) {
        authUser = await login(email, password);
      } else {
        authUser = await register(name, teamName || name, email, password, role);
      }
      if (onAuthSuccess) onAuthSuccess(authUser);
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoRole) => {
    setError('');
    setSubmitting(true);
    try {
      let authUser = null;
      if (demoRole === 'admin') {
        authUser = await loginAsAdmin();
      } else {
        authUser = await loginAsStudent();
      }
      if (onAuthSuccess) onAuthSuccess(authUser);
    } catch (err) {
      setError('Demo login failed. Make sure MongoDB & backend server are running.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '3.5rem 1rem', display: 'flex', justifyContent: 'center', background: 'var(--bg-paper)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2rem' }}>
        
        {/* Institution Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', marginBottom: '0.65rem' }}>
            <img
              src="/gprec_logo.png"
              alt="G. Pulla Reddy Engineering College Logo"
              style={{ height: '58px', width: 'auto', objectFit: 'contain' }}
            />
            <div style={{ width: '1px', height: '36px', background: 'var(--border-color)' }} />
            <img
              src="/coders_club_logo.png"
              alt="Coders' Club Logo"
              style={{ height: '52px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-ink)', margin: 0, lineHeight: 1.25 }}>
            G. Pulla Reddy Engineering College
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-slate)', fontWeight: 600, display: 'block', marginTop: '0.2rem' }}>
            Organized by Coders' Club
          </span>
        </div>




        {/* Header Tabs */}

        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '1.5rem'
        }}>
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            style={{
              flex: 1,
              padding: '0.65rem',
              background: 'none',
              border: 'none',
              borderBottom: isLogin ? '2px solid var(--accent-blue)' : '2px solid transparent',
              color: isLogin ? 'var(--accent-blue)' : 'var(--text-slate)',
              fontWeight: isLogin ? 600 : 500,
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            style={{
              flex: 1,
              padding: '0.65rem',
              background: 'none',
              border: 'none',
              borderBottom: !isLogin ? '2px solid var(--accent-blue)' : '2px solid transparent',
              color: !isLogin ? 'var(--accent-blue)' : 'var(--text-slate)',
              fontWeight: !isLogin ? 600 : 500,
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            Register Account
          </button>
        </div>

        {error && (
          <div style={{
            background: 'var(--diff-hard-bg)',
            border: '1px solid var(--diff-hard)',
            color: 'var(--diff-hard)',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.3rem' }}>Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.3rem' }}>Team / Group Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Team Alpha / Coders Squad"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>
            </>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.3rem' }}>Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. student@platform.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.3rem' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-slate)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.2rem'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', padding: '0.65rem' }}
          >
            {isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
            {submitting ? 'Connecting...' : isLogin ? 'Sign In to CodeArena' : 'Create Student Account'}
          </button>
        </form>

      </div>
    </div>
  );
};
