'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, RefreshCw, Users, ToggleRight, ToggleLeft, Trash2, Key, X, Check, Copy, ExternalLink } from '@/lib/icons'
import { serversApi, usersApi } from '@/lib/api/postgresql'

interface PgUser {
  id: string
  username: string
  server: string
  databaseName: string
  role: string
  accessProfile: string | null
  isActive: boolean
  expiry: string | null
  createdAt: string
  serverRef?: { name: string; host: string; port: number; sslEnabled: boolean } | null
  databaseRef?: { name: string } | null
}

const PROFILE_COLORS: Record<string, string> = {
  APP_READONLY: 'badge-info',
  APP_READWRITE: 'badge-success',
  APP_ADMIN: 'badge-purple',
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [servers, setServers] = useState<Array<{ id: string; name: string }>>([])
  const [databases, setDatabases] = useState<Array<{ name: string }>>([])
  const [loadingDbs, setLoadingDbs] = useState(false)
  const [form, setForm] = useState({
    serverId: '', databaseName: '', username: '',
    accessProfile: 'APP_READWRITE', expiry: '',
  })
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [connectionInfo, setConnectionInfo] = useState<{ host: string; port: number; name: string; ssl: boolean } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedConnStr, setCopiedConnStr] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)

  useEffect(() => {
    serversApi.list().then((d) => {
      const data = d as { servers?: Array<{ id: string; name: string }> }
      setServers(data.servers || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.serverId) { setDatabases([]); return }
    setLoadingDbs(true)
    serversApi.discoverDatabases(form.serverId).then((d) => {
      const data = d as { databases?: Array<{ name: string }> }
      setDatabases(data.databases || [])
      setForm(f => ({ ...f, databaseName: '' }))
    }).catch(() => setDatabases([]))
    .finally(() => setLoadingDbs(false))
  }, [form.serverId])

  const submit = async () => {
    setError('')
    if (!form.serverId || !form.databaseName || !form.username) {
      setError('All fields are required')
      return
    }
    setLoading(true)
    const res = await fetch('/api/postgres/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setGeneratedPassword(data.password)
    setConnectionInfo({ host: data.serverHost, port: data.serverPort, name: data.serverName, ssl: data.sslEnabled })
    setShowPassword(true)
    setStep(5)
    onCreated()
  }

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const buildConnectionString = () => {
    if (!connectionInfo) return ''
    const ssl = connectionInfo.ssl ? '?sslmode=require' : ''
    return `postgres://${form.username}:${generatedPassword}@${connectionInfo.host}:${connectionInfo.port}/${form.databaseName}${ssl}`
  }

  const copyConnectionString = () => {
    navigator.clipboard.writeText(buildConnectionString())
    setCopiedConnStr(true)
    setTimeout(() => setCopiedConnStr(false), 2000)
  }

  const close = () => {
    if (showPassword && !confirm('Password will not be shown again. Copy it now.')) return
    onClose()
  }

  if (step === 5 && showPassword) {
    const connStr = buildConnectionString()
    return (
      <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
        <div className="modal" style={{ maxWidth: 600 }}>
          <div className="modal-header">
            <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>User Created Successfully</h2>
            <button className="btn btn-icon btn-ghost" onClick={close}><X size={18} /></button>
          </div>
          <div className="modal-body" style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', textAlign: 'center' }}>
              User <strong style={{ color: 'var(--text-primary)' }}>{form.username}</strong> provisioned on <strong style={{ color: 'var(--text-primary)' }}>{form.databaseName}</strong> via <strong style={{ color: 'var(--text-primary)' }}>{connectionInfo?.name || ''}</strong>
            </div>

            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Connection String (share with team)</label>
              <div className="flex gap-2" style={{ alignItems: 'stretch' }}>
                <input className="form-input font-mono" readOnly value={connStr} style={{ fontSize: '0.72rem' }} />
                <button className="btn btn-secondary" onClick={copyConnectionString} title="Copy connection string">
                  {copiedConnStr ? <Check size={15} style={{ color: 'var(--success)' }} /> : <Copy size={15} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Generated Password (copy now — will not be shown again)</label>
              <div className="flex gap-2" style={{ alignItems: 'stretch' }}>
                <input className="form-input font-mono" readOnly value={generatedPassword} style={{ fontSize: '0.75rem' }} />
                <button className="btn btn-secondary" onClick={copyPassword} title="Copy password">
                  {copied ? <Check size={15} style={{ color: 'var(--success)' }} /> : <Copy size={15} />}
                </button>
              </div>
            </div>
            <div className="alert alert-warning" style={{ fontSize: '0.75rem' }}>
              Password is only shown once. Copy the connection string or password now.
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>Create PostgreSQL User</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Step 1: Select Server</label>
            <select className="form-select" value={form.serverId} onChange={(e) => setForm(f => ({ ...f, serverId: e.target.value }))}>
              <option value="">-- Select Server --</option>
              {servers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Step 2: Database Name *</label>
              <select className="form-select" value={form.databaseName} onChange={(e) => setForm(f => ({ ...f, databaseName: e.target.value }))} disabled={!form.serverId || loadingDbs}>
                <option value="">{loadingDbs ? 'Loading...' : '-- Select Database --'}</option>
                {databases.map((db) => <option key={db.name} value={db.name}>{db.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Step 3: Username *</label>
              <input className="form-input font-mono" value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} placeholder="app_user" />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Step 4: Access Profile</label>
              <select className="form-select" value={form.accessProfile} onChange={(e) => setForm(f => ({ ...f, accessProfile: e.target.value }))}>
                <option value="APP_READONLY">Read Only</option>
                <option value="APP_READWRITE">Read Write (Default)</option>
                <option value="APP_ADMIN">Admin (Requires approval)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Step 5: Expiry Date</label>
              <input type="date" className="form-input" value={form.expiry} onChange={(e) => setForm(f => ({ ...f, expiry: e.target.value }))} />
            </div>
          </div>

          {form.accessProfile === 'APP_ADMIN' && (
            <div className="alert alert-warning">
              APP_ADMIN profile grants broad permissions. This will be flagged for review.
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Check size={15} />}
            Provision User
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState<PgUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [passwordPrompt, setPasswordPrompt] = useState<{ user: PgUser; password: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/postgres/users?search=${encodeURIComponent(search)}`)
    const data = await res.json()
    setUsers(data.pgUsers || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  const toggle = async (id: string, isActive: boolean) => {
    await usersApi.update(id, { isActive: !isActive })
    load()
  }

  const remove = async (id: string, username: string) => {
    if (!confirm(`Delete PostgreSQL user "${username}"? This will also drop the database role.`)) return
    await usersApi.remove(id)
    load()
  }

  const rotate = async (id: string, username: string) => {
    if (!confirm(`Rotate password for "${username}"?`)) return
    const result = (await usersApi.rotatePassword(id)) as { password?: string }
    if (result.password) {
      await navigator.clipboard.writeText(result.password)
      alert('Password rotated and copied to clipboard.')
    }
    load()
  }

  const copyConnStr = (u: PgUser) => {
    if (!u.serverRef) return
    setPasswordPrompt({ user: u, password: '' })
  }

  const submitConnStr = () => {
    if (!passwordPrompt || !passwordPrompt.password) return
    const u = passwordPrompt.user
    if (!u.serverRef) return
    const ssl = u.serverRef.sslEnabled ? '?sslmode=require' : ''
    const connStr = `postgres://${u.username}:${passwordPrompt.password}@${u.serverRef.host}:${u.serverRef.port}/${u.databaseRef?.name || u.databaseName}${ssl}`
    navigator.clipboard.writeText(connStr)
    setCopiedId(u.id)
    setPasswordPrompt(null)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="animate-fadein">
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={load} />}

      {passwordPrompt && (
        <div className="modal-backdrop" onClick={() => setPasswordPrompt(null)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>Enter Password</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setPasswordPrompt(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Enter the password for <strong>{passwordPrompt.user.username}</strong> to copy the full connection string.
              </p>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  className="form-input font-mono"
                  type="password"
                  autoFocus
                  value={passwordPrompt.password}
                  onChange={(e) => setPasswordPrompt(p => p ? { ...p, password: e.target.value } : null)}
                  onKeyDown={(e) => e.key === 'Enter' && submitConnStr()}
                  placeholder="Enter password"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPasswordPrompt(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitConnStr} disabled={!passwordPrompt.password}>
                <Check size={15} /> Copy Connection String
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users size={24} style={{ color: 'var(--brand-cyan)' }} /> PostgreSQL Users
          </h1>
          <p className="page-subtitle">{total} database users</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create User
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="search-wrapper" style={{ maxWidth: 380 }}>
          <Search size={15} className="search-icon" />
          <input className="form-input search-input" placeholder="Search by username..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Server</th>
              <th>Database</th>
              <th>Access Profile</th>
              <th>Status</th>
              <th>Expiry</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><div style={{ height: 20, background: 'var(--bg-elevated)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} /></td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No users found. Create one to get started.
                </td>
              </tr>
            ) : users.map((u) => (
              <tr key={u.id}>
                <td><span className="font-mono" style={{ fontSize: '0.85rem' }}>{u.username}</span></td>
                <td><span className="text-sm text-muted">{u.serverRef?.name || u.server}</span></td>
                <td><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{u.databaseRef?.name || u.databaseName}</span></td>
                <td>
                  <span className={`badge ${PROFILE_COLORS[u.accessProfile || ''] || 'badge-muted'}`}>
                    {(u.accessProfile || u.role).replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.isActive ? 'badge-success' : 'badge-muted'}`}>
                    {u.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {u.expiry ? new Date(u.expiry).toLocaleDateString() : '—'}
                </td>
                <td>
                  <div className="flex gap-1">
                    <button className="btn btn-icon btn-ghost" title={u.isActive ? 'Disable' : 'Enable'} onClick={() => toggle(u.id, u.isActive)}>
                      {u.isActive ? <ToggleRight size={16} style={{ color: 'var(--success)' }} /> : <ToggleLeft size={16} />}
                    </button>
                    <button className="btn btn-icon btn-ghost" title="Copy Connection String" onClick={() => copyConnStr(u)}>
                      {copiedId === u.id ? <Check size={15} style={{ color: 'var(--success)' }} /> : <ExternalLink size={15} />}
                    </button>
                    <button className="btn btn-icon btn-ghost" title="Rotate Password" onClick={() => rotate(u.id, u.username)}>
                      <Key size={15} />
                    </button>
                    <button className="btn btn-icon btn-danger" title="Delete" onClick={() => remove(u.id, u.username)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
