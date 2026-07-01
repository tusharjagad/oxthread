'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Search, Shield, Trash2, Check, X, ToggleRight, ToggleLeft, Loader2, ChevronLeft, ChevronRight, Key, Copy, Ban, RefreshCw, Lock, ShieldCheck } from '@/lib/icons'

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'DEVELOPER', 'READ_ONLY'] as const

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'badge-purple',
  ADMIN: 'badge-warning',
  DEVELOPER: 'badge-info',
  READ_ONLY: 'badge-muted',
}

interface User {
  id: string
  username: string
  accessKey: string
  role: string
  isActive: boolean
  isLocked: boolean
  totpEnabled: boolean
  expiry: string | null
  lastLogin: string | null
  createdAt: string
  failedLogins: number
}

export default function TeamsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const limit = 20

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) })
      if (q) params.set('search', q)
      const res = await fetch(`/api/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
        setTotal(data.total || 0)
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok && r.json()).then(d => setMyRole(d.user?.role || null)).catch(() => {})
  }, [])

  useEffect(() => { load(page, search) }, [page, search, load])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== id))
        setTotal(prev => prev - 1)
      }
    } catch {
      /* ignore */
    } finally {
      setDeletingId(null)
      setConfirmDelete(null)
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !isActive } : u))
      }
    } catch {
      /* ignore */
    }
  }

  const handleUnlock = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: false }),
      })
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, isLocked: false, failedLogins: 0 } : u))
      }
    } catch {
      /* ignore */
    }
  }

  const handleRoleChange = async (id: string, role: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
      }
    } catch {
      /* ignore */
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="animate-fadein">
      <div className="page-header">
        <div>
          <h1 className="page-title">Teams</h1>
          <p className="page-subtitle">Manage users, roles, and access</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); load(1, '') }}>
            <RefreshCw size={14} /> Refresh
          </button>
          {(myRole === 'SUPER_ADMIN' || myRole === 'ADMIN') && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Add User
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            className="form-input"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by username..."
            style={{ border: 'none', padding: '0.35rem 0', fontSize: '0.85rem', flex: 1, background: 'transparent' }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <Loader2 size={24} className="animate-spin" style={{ opacity: 0.4 }} />
        </div>
      ) : users.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: 'var(--bg-elevated)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
          }}>
            <Users size={28} style={{ opacity: 0.3 }} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {search ? 'No users match your search' : 'No users found'}
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>2FA</th>
                <th>Last Login</th>
                <th>Created</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className="font-mono" style={{ fontSize: '0.85rem' }}>{u.username}</span>
                  </td>
                  <td>
                    <select
                      className="badge-select"
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={myRole !== 'SUPER_ADMIN' && myRole !== 'ADMIN'}
                      style={{
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--bg-border)',
                        borderRadius: 999,
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: (myRole === 'SUPER_ADMIN' || myRole === 'ADMIN') ? 'pointer' : 'default',
                      }}
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>
                          {r.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-muted'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {u.isLocked && (
                        <span className="badge badge-danger">Locked</span>
                      )}
                      {u.failedLogins > 0 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          ({u.failedLogins} fails)
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${u.totpEnabled ? 'badge-success' : 'badge-muted'}`}>
                      {u.totpEnabled ? 'Enabled' : 'Off'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      <button
                        className="btn btn-icon btn-ghost"
                        title={u.isActive ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggleActive(u.id, u.isActive)}
                        disabled={myRole !== 'SUPER_ADMIN' && myRole !== 'ADMIN'}
                      >
                        {u.isActive ? <ToggleRight size={16} style={{ color: 'var(--success)' }} /> : <ToggleLeft size={16} />}
                      </button>
                      {u.isLocked && (
                        <button
                          className="btn btn-icon btn-ghost"
                          title="Unlock account"
                          onClick={() => handleUnlock(u.id)}
                          disabled={myRole !== 'SUPER_ADMIN' && myRole !== 'ADMIN'}
                        >
                          <ShieldCheck size={15} style={{ color: 'var(--warning)' }} />
                        </button>
                      )}
                      {confirmDelete === u.id ? (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem', lineHeight: 1.2 }}
                            onClick={() => handleDelete(u.id)}
                            disabled={deletingId === u.id}
                          >
                            {deletingId === u.id ? <Loader2 size={10} className="animate-spin" /> : 'Yes'}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem', lineHeight: 1.2 }}
                            onClick={() => setConfirmDelete(null)}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-icon btn-ghost"
                          title="Delete user"
                          onClick={() => setConfirmDelete(u.id)}
                          disabled={myRole !== 'SUPER_ADMIN'}
                          style={{ color: myRole === 'SUPER_ADMIN' ? 'var(--danger)' : 'var(--text-muted)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', fontSize: '0.82rem' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.35rem 0.6rem' }}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.35rem 0.6rem' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(page, search) }}
        />
      )}
    </div>
  )
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<string>('DEVELOPER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ accessKey: string } | null>(null)

  const submit = async () => {
    setError('')
    if (!username || !password) {
      setError('Username and password are required')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ accessKey: data.user.accessKey })
      } else {
        setError(data.error || 'Failed to create user')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 480 }}>
          <div className="modal-header">
            <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>User Created</h2>
            <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
          </div>
          <div className="modal-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Check size={24} style={{ color: 'var(--success)' }} />
            </div>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              User <strong>{username}</strong> created as <strong>{role.replace('_', ' ')}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Access Key (copy now — shown once)</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                <input className="form-input font-mono" readOnly value={result.accessKey} style={{ fontSize: '0.8rem' }} />
                <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(result.accessKey)}>
                  <Copy size={14} />
                </button>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={onCreated}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>Add User</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. jdoe" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map(r => (
                <option key={r} value={r}>{r.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            Create User
          </button>
        </div>
      </div>
    </div>
  )
}
