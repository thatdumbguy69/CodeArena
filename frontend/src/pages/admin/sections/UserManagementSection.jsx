import React, { useState } from 'react';
import { UserCog, Search, Trash2, ShieldAlert, UserCheck, Shield, AlertTriangle, UserPlus, X, Lock, Mail, User, ShieldCheck } from 'lucide-react';
import { ConfirmActionModal } from '../../../components/admin/modals/ConfirmActionModal';
import api from '../../../services/api';

export const UserManagementSection = ({
  usersList = [],
  currentUser,
  onDeleteUser,
  onDeleteAllStudents,
  onUserCreated
}) => {
  const [roleTab, setRoleTab] = useState('All'); // All | Admins | Students
  const [search, setSearch] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // Create User Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    teamName: '',
    email: '',
    password: '',
    role: 'student'
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  const filteredUsers = (usersList || []).filter(u => {
    if (!u) return false;
    const name = (u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const teamName = (u.teamName || '').toLowerCase();
    const q = (search || '').toLowerCase();
    const matchesSearch = !q || name.includes(q) || email.includes(q) || teamName.includes(q);
    let matchesRole = true;
    if (roleTab === 'Admins') matchesRole = u.role === 'admin';
    if (roleTab === 'Students') matchesRole = u.role !== 'admin';
    return matchesSearch && matchesRole;
  });

  const studentCount = (usersList || []).filter(u => u && u.role !== 'admin').length;

  const handleOpenCreateModal = () => {
    setNewUserForm({
      name: '',
      teamName: '',
      email: '',
      password: '',
      role: 'student'
    });
    setCreateError('');
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!newUserForm.name.trim() || !newUserForm.email.trim() || !newUserForm.password.trim()) {
      setCreateError('Name, email, and password are required.');
      return;
    }

    setCreateSubmitting(true);
    try {
      const res = await api.post('/auth/users', {
        name: newUserForm.name.trim(),
        teamName: newUserForm.teamName.trim() || newUserForm.name.trim(),
        email: newUserForm.email.trim().toLowerCase(),
        password: newUserForm.password,
        role: newUserForm.role
      });

      if (onUserCreated && res.data?.user) {
        onUserCreated(res.data.user);
      }
      setCreateModalOpen(false);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create user account.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleDeletePrompt = (userObj) => {
    if (String(userObj._id || userObj.id) === String(currentUser?.id)) {
      alert('You cannot delete your own admin account while logged in.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      userToDelete: userObj,
      title: `Remove User Account "${userObj.name}"`,
      message: `Are you sure you want to permanently remove user account "${userObj.name}" (${userObj.email})? This action will purge all candidate submission records and cannot be undone.`,
      confirmText: 'Remove User Account',
      onConfirm: () => {
        onDeleteUser(userObj._id || userObj.id, userObj.name);
      }
    });
  };

  const handleDeleteAllStudentsPrompt = () => {
    setBulkConfirmOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-ink)' }}>
            User Accounts &amp; Access Control
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            View registered platform accounts and manage user roles or removals. Total Accounts: {usersList.length}
          </span>
        </div>

        {/* Create User Button */}
        <button
          onClick={handleOpenCreateModal}
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'var(--accent-blue)',
            color: '#FFFFFF',
            borderRadius: '7px',
            fontWeight: 700,
            fontSize: '0.86rem',
            padding: '0.55rem 1.1rem',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
          }}
        >
          <UserPlus size={15} />
          Create User
        </button>
      </div>

      {/* Role Tabs + Bulk Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['All', 'Admins', 'Students'].map(r => (
            <button
              key={r}
              onClick={() => setRoleTab(r)}
              className="btn btn-secondary btn-sm"
              style={{
                background: roleTab === r ? 'var(--accent-blue)' : 'transparent',
                color: roleTab === r ? '#FFF' : 'var(--text-secondary)',
                fontWeight: roleTab === r ? 700 : 500
              }}
            >
              {r === 'All' ? `All Users (${usersList.length})` : r}
              {r === 'Students' && studentCount > 0 && (
                <span style={{
                  marginLeft: '6px',
                  background: roleTab === r ? 'rgba(255,255,255,0.25)' : 'var(--bg-paper)',
                  color: roleTab === r ? '#FFF' : 'var(--text-secondary)',
                  borderRadius: '99px',
                  padding: '0 6px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  {studentCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Remove All Students — only show when Students tab is active */}
        {roleTab === 'Students' && (
          <button
            onClick={handleDeleteAllStudentsPrompt}
            className="btn btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#FEF2F2',
              color: '#B91C1C',
              border: '1.5px solid #FCA5A5',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.82rem',
              padding: '0.45rem 0.9rem',
              cursor: studentCount === 0 ? 'not-allowed' : 'pointer',
              opacity: studentCount === 0 ? 0.5 : 1
            }}
            disabled={studentCount === 0}
            title={studentCount === 0 ? 'No student accounts to remove' : `Remove all ${studentCount} student account(s)`}
          >
            <AlertTriangle size={14} />
            Remove All Students ({studentCount})
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search account name, team, or email..."
            style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.25rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', minWidth: '760px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-paper)' }}>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Team / Group Name</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Participant Name</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Email</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Role</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'right' }}>Score</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Solved Count</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Last Active</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>Registered Date</th>
                <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No user accounts found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const isSelf = String(u._id || u.id) === String(currentUser?.id);
                  return (
                    <tr key={u._id || u.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, maxWidth: '160px', wordBreak: 'break-word' }}>
                        {u.teamName || u.name || 'Individual'}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, maxWidth: '150px', wordBreak: 'break-word' }}>
                        {u.name || 'User'} {isSelf && <span style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', marginLeft: '4px' }}>(You)</span>}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.email}>{u.email}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: u.role === 'admin' ? '#E0E7FF' : 'var(--bg-paper)',
                          color: u.role === 'admin' ? '#4F46E5' : 'var(--text-secondary)',
                          display: 'inline-block'
                        }}>
                          {u.role === 'admin' ? 'ADMIN' : 'STUDENT'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: 'var(--accent-blue)', textAlign: 'right', whiteSpace: 'nowrap' }}>{u.score || 0} pts</td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#15803D', textAlign: 'center', whiteSpace: 'nowrap' }}>{u.solvedCount || 0}</td>
                      <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active')}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {!isSelf ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDeletePrompt(u)}
                            style={{ color: '#DC2626', padding: '0.3rem 0.55rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Trash2 size={13} /> Remove User
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Active Admin</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single-user delete confirmation */}
      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false })}
        onConfirm={confirmModal.onConfirm || (() => {})}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        requireTypedConfirmation={true}
        confirmationKeyword="DELETE"
      />

      {/* Bulk remove all students confirmation */}
      <ConfirmActionModal
        isOpen={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        onConfirm={() => {
          setBulkConfirmOpen(false);
          onDeleteAllStudents && onDeleteAllStudents();
        }}
        title={`⚠️ Remove All ${studentCount} Student Account(s)`}
        message={`This will permanently delete ALL ${studentCount} student account(s) from the platform. Admin accounts will NOT be affected. This action cannot be undone — all student data, scores, and submissions will be lost.`}
        confirmText="Yes, Remove All Students"
        requireTypedConfirmation={true}
        confirmationKeyword="REMOVE ALL"
      />

      {/* Create New User Modal */}
      {createModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-card, #FFFFFF)',
            color: 'var(--text-ink, #0F172A)',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            maxWidth: '480px',
            width: '100%',
            overflow: 'hidden',
            border: '1px solid var(--border-color, #E2E8F0)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-color, #E2E8F0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-paper, #F8FAFC)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(79, 70, 229, 0.1)',
                  color: 'var(--accent-blue, #4F46E5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Create New User</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #64748B)' }}>
                    Provision a candidate or admin account permanently
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary, #64748B)',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {createError && (
                <div style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#B91C1C',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}>
                  {createError}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Full Name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Alex Johnson"
                  value={newUserForm.name}
                  onChange={e => setNewUserForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #CBD5E1)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              {/* Team / Group Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Team / Department / College
                </label>
                <input
                  type="text"
                  placeholder="e.g., CSE Alpha (defaults to name if empty)"
                  value={newUserForm.teamName}
                  onChange={e => setNewUserForm(prev => ({ ...prev, teamName: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #CBD5E1)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Email Address <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="candidate@example.com"
                  value={newUserForm.email}
                  onChange={e => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #CBD5E1)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Initial Password <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newUserForm.password}
                  onChange={e => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #CBD5E1)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              {/* Role Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.45rem' }}>
                  Account Role
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    border: newUserForm.role === 'student' ? '2px solid var(--accent-blue, #4F46E5)' : '1px solid var(--border-color, #CBD5E1)',
                    background: newUserForm.role === 'student' ? 'rgba(79, 70, 229, 0.05)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: newUserForm.role === 'student' ? 700 : 500
                  }}>
                    <input
                      type="radio"
                      name="role"
                      value="student"
                      checked={newUserForm.role === 'student'}
                      onChange={() => setNewUserForm(prev => ({ ...prev, role: 'student' }))}
                    />
                    Student (Participant)
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    border: newUserForm.role === 'admin' ? '2px solid #7C3AED' : '1px solid var(--border-color, #CBD5E1)',
                    background: newUserForm.role === 'admin' ? 'rgba(124, 58, 237, 0.05)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: newUserForm.role === 'admin' ? 700 : 500
                  }}>
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={newUserForm.role === 'admin'}
                      onChange={() => setNewUserForm(prev => ({ ...prev, role: 'admin' }))}
                    />
                    Administrator
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.55rem 1rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="btn btn-primary btn-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'var(--accent-blue, #4F46E5)',
                    color: '#fff',
                    fontWeight: 700,
                    padding: '0.55rem 1.25rem',
                    borderRadius: '6px',
                    opacity: createSubmitting ? 0.7 : 1,
                    cursor: createSubmitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  <UserPlus size={14} />
                  {createSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
