'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useToast } from '../../components';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  bushaStatus: string;
  campaignCount: number;
  donationCount: number;
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'var(--amber)',
  creator: 'var(--teal-200)',
  backer: 'var(--w50)',
  banned: '#F09595',
};

const KYC_COLORS: Record<string, string> = {
  verified: 'var(--teal-200)',
  pending: 'var(--amber)',
  unverified: 'var(--w30)',
  rejected: '#F09595',
};

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [roleFilter, setRoleFilter] = useState('all');
  const [kycFilter, setKycFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [busyUser, setBusyUser] = useState('');
  const [roleModalUser, setRoleModalUser] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createRole, setCreateRole] = useState('backer');
  const [createPassword, setCreatePassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const load = useCallback(async () => {
    setLoadStatus('loading');
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (kycFilter !== 'all') params.set('kyc', kycFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/users?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
      setLoadStatus('ready');
    } catch {
      setLoadStatus('error');
    }
  }, [page, roleFilter, kycFilter, search]);

  useEffect(() => { load(); }, [load]);

  const runAction = async (userId: string, action: string, role?: string) => {
    setBusyUser(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('User updated.', 'success');
      setRoleModalUser(null);
      await load();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to update user.', 'error');
    } finally {
      setBusyUser('');
    }
  };

  const setKycStatus = async (userId: string, kycStatus: string) => {
    setBusyUser(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'set-kyc', kycStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('KYC status updated.', 'success');
      await load();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to update KYC status.', 'error');
    } finally {
      setBusyUser('');
    }
  };

  const createUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          role: createRole,
          password: createPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('User created.', 'success');
      setCreateOpen(false);
      setCreateName('');
      setCreateEmail('');
      setCreateRole('backer');
      setCreatePassword('');
      await load();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to create user.', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const deleteUser = async (user: AdminUser) => {
    if (!window.confirm(`Delete ${user.email}? Accounts with history should be banned instead.`)) return;
    await runAction(user.id, 'delete');
  };

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <div className="page-sub">{total.toLocaleString()} total users</div>
        </div>
        <div className="header-actions">
          <a href="/api/admin/exports?kind=users" className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>Export CSV</a>
          <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => setCreateOpen(true)}>Create user</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1); }} style={{ display: 'flex', gap: 8 }}>
          <input
            className="s-input"
            placeholder="Search name or email..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{ minWidth: 240 }}
          />
          <button type="submit" className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>Search</button>
          {search && <button type="button" className="btn-secondary" style={{ padding: '8px 12px', fontSize: 13 }} onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>Clear</button>}
        </form>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'creator', 'backer', 'admin', 'banned'].map(r => (
            <button
              key={r}
              onClick={() => { setRoleFilter(r); setPage(1); }}
              style={{
                padding: '6px 12px', fontSize: 12, borderRadius: 6, border: '1px solid',
                borderColor: roleFilter === r ? 'var(--teal-200)' : 'rgba(245,250,247,0.1)',
                background: roleFilter === r ? 'rgba(93,202,165,0.12)' : 'transparent',
                color: roleFilter === r ? 'var(--teal-200)' : 'var(--w50)',
                cursor: 'pointer', textTransform: 'capitalize',
              }}
            >
              {r}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'verified', 'pending', 'unverified', 'rejected'].map(k => (
            <button
              key={k}
              onClick={() => { setKycFilter(k); setPage(1); }}
              style={{
                padding: '6px 12px', fontSize: 12, borderRadius: 6, border: '1px solid',
                borderColor: kycFilter === k ? (KYC_COLORS[k] ?? 'var(--teal-200)') : 'rgba(245,250,247,0.1)',
                background: kycFilter === k ? `${KYC_COLORS[k] ?? 'var(--teal-200)'}18` : 'transparent',
                color: kycFilter === k ? (KYC_COLORS[k] ?? 'var(--teal-200)') : 'var(--w50)',
                cursor: 'pointer', textTransform: 'capitalize',
              }}
            >
              {k} KYC
            </button>
          ))}
        </div>
      </div>

      <div className="content-card">
        {loadStatus === 'loading' && <div style={{ color: 'var(--w50)', padding: 20 }}>Loading users...</div>}
        {loadStatus === 'error' && <div style={{ color: 'var(--amber)', padding: 20 }}>Failed to load users.</div>}

        {loadStatus === 'ready' && users.length === 0 && (
          <div style={{ color: 'var(--w50)', padding: 20 }}>No users found.</div>
        )}

        {users.length > 0 && (
          <div className="txn-table-wrap">
            <table className="txn-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>KYC</th>
                  <th>Campaigns</th>
                  <th>Donations</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {u.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.image} alt={u.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(93,202,165,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--teal-200)', flexShrink: 0 }}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--w50)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, background: `${ROLE_COLORS[u.role] ?? 'var(--w50)'}18`, color: ROLE_COLORS[u.role] ?? 'var(--w50)', fontWeight: 700, textTransform: 'capitalize' }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <select
                        value={u.bushaStatus}
                        disabled={busyUser === u.id}
                        onChange={event => setKycStatus(u.id, event.target.value)}
                        className="s-input"
                        style={{ width: 132, padding: '6px 8px', fontSize: 12, color: KYC_COLORS[u.bushaStatus] ?? 'var(--w30)' }}
                      >
                        <option value="unverified">Unverified</option>
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                    <td style={{ color: 'var(--w80)' }}>{u.campaignCount}</td>
                    <td style={{ color: 'var(--w80)' }}>{u.donationCount}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                          disabled={busyUser === u.id}
                          onClick={() => { setRoleModalUser(u); setNewRole(u.role); }}
                        >
                          Change role
                        </button>
                        {u.role === 'banned' ? (
                          <button className="btn-primary" style={{ padding: '4px 8px', fontSize: 12 }} disabled={busyUser === u.id} onClick={() => runAction(u.id, 'unban')}>
                            Unban
                          </button>
                        ) : (
                          <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: 12, color: '#F09595' }} disabled={busyUser === u.id} onClick={() => runAction(u.id, 'ban')}>
                            Ban
                          </button>
                        )}
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: 12, color: '#F09595' }}
                          disabled={busyUser === u.id}
                          onClick={() => deleteUser(u)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ fontSize: 13, color: 'var(--w50)' }}>Page {page} of {pages}</span>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {roleModalUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: 340 }}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Change role — {roleModalUser.name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {['creator', 'backer', 'admin'].map(r => (
                <button
                  key={r}
                  onClick={() => setNewRole(r)}
                  style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid', textAlign: 'left', textTransform: 'capitalize', cursor: 'pointer', fontSize: 14,
                    borderColor: newRole === r ? 'var(--teal-200)' : 'rgba(245,250,247,0.1)',
                    background: newRole === r ? 'rgba(93,202,165,0.1)' : 'transparent',
                    color: newRole === r ? 'var(--teal-200)' : 'var(--fg)',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" style={{ flex: 1 }} disabled={busyUser === roleModalUser.id} onClick={() => runAction(roleModalUser.id, 'set-role', newRole)}>
                {busyUser === roleModalUser.id ? 'Saving...' : 'Save'}
              </button>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setRoleModalUser(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: 'min(460px, 100%)' }}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Create user</h3>
            <form onSubmit={createUser} style={{ display: 'grid', gap: 14 }}>
              <div className="s-field">
                <label className="s-label">Name</label>
                <input className="s-input" value={createName} onChange={e => setCreateName(e.target.value)} required />
              </div>
              <div className="s-field">
                <label className="s-label">Email</label>
                <input className="s-input" type="email" value={createEmail} onChange={e => setCreateEmail(e.target.value)} required />
              </div>
              <div className="s-field">
                <label className="s-label">Role</label>
                <select className="s-input" value={createRole} onChange={e => setCreateRole(e.target.value)}>
                  <option value="backer">Backer</option>
                  <option value="creator">Creator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="s-field">
                <label className="s-label">Password</label>
                <input className="s-input" type="password" minLength={8} value={createPassword} onChange={e => setCreatePassword(e.target.value)} placeholder="Optional for OAuth-only account" />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button className="btn-primary" type="submit" style={{ flex: 1 }} disabled={createLoading}>
                  {createLoading ? 'Creating...' : 'Create'}
                </button>
                <button className="btn-secondary" type="button" style={{ flex: 1 }} onClick={() => setCreateOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
