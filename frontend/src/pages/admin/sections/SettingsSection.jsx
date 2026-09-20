import React, { useState, useEffect } from 'react';
import { Settings, Shield, Code, Clock, Save, Check, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../../services/api';

export const SettingsSection = ({ currentUser }) => {
  const [settings, setSettings] = useState({
    defaultDuration: 60,
    maxAllowedBlurs: 3,
    autoDisqualify: true,
    defaultTimeLimit: 2000,
    defaultMemoryLimit: 256,
    judge0Mode: 'Production Cluster'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data && res.data.settings) {
        setSettings({
          defaultDuration: res.data.settings.defaultDuration || 60,
          maxAllowedBlurs: res.data.settings.maxAllowedBlurs !== undefined ? res.data.settings.maxAllowedBlurs : 3,
          autoDisqualify: res.data.settings.autoDisqualify !== undefined ? res.data.settings.autoDisqualify : true,
          defaultTimeLimit: res.data.settings.defaultTimeLimit || 2000,
          defaultMemoryLimit: res.data.settings.defaultMemoryLimit || 256,
          judge0Mode: res.data.settings.judge0Mode || 'Production Cluster'
        });
      }
    } catch (err) {
      console.error('Failed to load system settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg('');
      const res = await api.put('/settings', {
        ...settings,
        maxAllowedBlurs: Math.max(1, parseInt(settings.maxAllowedBlurs, 10) || 3),
        syncToActiveContests: true
      });

      if (res.data && res.data.settings) {
        setSettings(prev => ({ ...prev, ...res.data.settings }));
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
          Platform System & Proctoring Configuration
        </h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Configure contest defaults, real-time proctoring thresholds, and execution engine parameters.
        </span>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 className="spinner" size={24} style={{ marginBottom: '0.5rem' }} />
          <div>Loading platform configuration...</div>
        </div>
      ) : (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Contest Defaults Card */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="var(--accent-blue)" /> Contest Hosting Defaults
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  Default Contest Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={settings.defaultDuration}
                  onChange={e => setSettings({ ...settings, defaultDuration: parseInt(e.target.value, 10) || 60 })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  Default Execution Time Limit (ms)
                </label>
                <input
                  type="number"
                  min="500"
                  max="10000"
                  value={settings.defaultTimeLimit}
                  onChange={e => setSettings({ ...settings, defaultTimeLimit: parseInt(e.target.value, 10) || 2000 })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Proctoring Rules Card */}
          <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid #DC2626' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#DC2626' }}>
              <Shield size={18} color="#DC2626" /> Security & Proctoring Thresholds
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
              Changes to these thresholds are immediately saved and applied to active contests and student workspaces.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-ink)' }}>
                  Maximum Tab Blur Threshold (Switches before lock)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.maxAllowedBlurs}
                    onChange={e => setSettings({ ...settings, maxAllowedBlurs: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    style={{ width: '140px', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1.5px solid var(--border-color)', outline: 'none', fontWeight: 700, fontSize: '1rem' }}
                  />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Violations allowed before the student's exam is locked. (e.g. <strong>3</strong> allows 2 warnings and locks on 3rd violation).
                  </span>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, padding: '0.75rem', background: 'var(--bg-paper)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <input
                  type="checkbox"
                  style={{ marginTop: '0.2rem' }}
                  checked={settings.autoDisqualify}
                  onChange={e => setSettings({ ...settings, autoDisqualify: e.target.checked })}
                />
                <div>
                  <div>Enable Automatic Disqualification when threshold is exceeded</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 400, marginTop: '0.2rem' }}>
                    If checked, students will be automatically disqualified and their contest auto-submitted upon reaching the blur threshold.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Error Message Display */}
          {errorMsg && (
            <div style={{ padding: '0.75rem 1rem', background: '#FEE2E2', border: '1px solid #F87171', borderRadius: '6px', color: '#B91C1C', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          {/* Save Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {saving ? <Loader2 className="spinner" size={16} /> : <Save size={16} />}
              {saving ? 'Saving Configuration...' : 'Save Configuration'}
            </button>
            {savedSuccess && (
              <span style={{ color: '#15803D', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Check size={16} /> Settings saved & synced to active contests successfully!
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
