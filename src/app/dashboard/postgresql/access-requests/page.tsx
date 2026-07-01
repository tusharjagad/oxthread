'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, FileKey, Check, X, Clock, Ban, ArrowRight } from '@/lib/icons'
import { useAuth } from '@/contexts/auth-context'

interface AccessRequest {
  id: string
  userId: string
  username: string
  serverId: string
  databaseName: string | null
  accessProfile: string
  status: string
  reason: string | null
  approvedBy: string | null
  approvedAt: string | null
  expiresAt: string | null
  createdAt: string
  server: { name: string; host: string } | null
}

const STATUS_STYLES: Record<string, { badge: string; icon: React.ReactNode }> = {
  PENDING: { badge: 'badge-warning', icon: <Clock size={12} /> },
  APPROVED: { badge: 'badge-info', icon: <Check size={12} /> },
  REJECTED: { badge: 'badge-danger', icon: <X size={12} /> },
  PROVISIONED: { badge: 'badge-success', icon: <Check size={12} /> },
  EXPIRED: { badge: 'badge-muted', icon: <Ban size={12} /> },
}

const PROFILE_LABELS: Record<string, string> = {
  APP_READONLY: 'Read Only',
  APP_READWRITE: 'Read Write',
  APP_ADMIN: 'Admin',
}

function CreateRequestModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [servers, setServers] = useState<Array<{ id: string; name: string }>>([])
  const [form, setForm] = useState({
    serverId: '', databaseName: '', accessProfile: 'APP_READWRITE',
    reason: '', expiresAt: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/postgres/servers')
      .then((r) => r.json())
      .then((d) => setServers(d.servers || []))
      .catch(() => {})
  }, [])

  const submit = async () => {
    setError('')
    if (!form.serverId || !form.databaseName || !form.reason) {
      setError('Server, database, and reason are required')
      return
    }
    setLoading(true)
    const res = await fetch('/api/postgres/access-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    onCreated()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>Request Database Access</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Server</label>
            <select className="form-select" value={form.serverId} onChange={(e) => setForm(f => ({ ...f, serverId: e.target.value }))}>
              <option value="">-- Select Server --</option>
              {servers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Database Name</label>
              <input className="form-input" value={form.databaseName} onChange={(e) => setForm(f => ({ ...f, databaseName: e.target.value }))} placeholder="my_database" />
            </div>
            <div className="form-group">
              <label className="form-label">Access Profile</label>
              <select className="form-select" value={form.accessProfile} onChange={(e) => setForm(f => ({ ...f, accessProfile: e.target.value }))}>
                <option value="APP_READONLY">Read Only</option>
                <option value="APP_READWRITE">Read Write</option>
                <option value="APP_ADMIN">Admin</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reason *</label>
            <textarea className="form-textarea" value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Why do you need access?" rows={3} />
          </div>

          <div className="form-group">
            <label className="form-label">Expires At (optional)</label>
            <input type="date" className="form-input" value={form.expiresAt} onChange={(e) => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <ArrowRight size={15} />}
            Submit Request
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AccessRequestsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/postgres/access-requests?${params}`)
    const data = await res.json()
    setRequests(data.requests || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    const res = await fetch(`/api/postgres/access-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) load()
  }

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'

  return (
    <div className="animate-fadein">
      {showCreate && <CreateRequestModal onClose={() => setShowCreate(false)} onCreated={load} />}

      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileKey size={24} style={{ color: 'var(--warning)' }} /> Access Requests
          </h1>
          <p className="page-subtitle">{total} requests</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Request
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {['', 'PENDING', 'APPROVED', 'REJECTED', 'PROVISIONED', 'EXPIRED'].map((s) => (
            <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setStatusFilter(s)}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Requester</th>
              <th>Server</th>
              <th>Database</th>
              <th>Profile</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Created</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: isAdmin ? 8 : 7 }).map((_, j) => (
                    <td key={j}><div style={{ height: 20, background: 'var(--bg-elevated)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} /></td>
                  ))}
                </tr>
              ))
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No access requests found
                </td>
              </tr>
            ) : requests.map((r) => {
              const style = STATUS_STYLES[r.status] || { badge: 'badge-muted', icon: null }
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.username}</td>
                  <td><span className="text-sm text-muted">{r.server?.name || r.serverId}</span></td>
                  <td><span className="font-mono text-sm">{r.databaseName || '—'}</span></td>
                  <td><span className={`badge badge-${r.accessProfile === 'APP_ADMIN' ? 'purple' : r.accessProfile === 'APP_READWRITE' ? 'success' : 'info'}`}>
                    {PROFILE_LABELS[r.accessProfile] || r.accessProfile}
                  </span></td>
                  <td style={{ maxWidth: 200 }}><span className="text-sm truncate" style={{ display: 'block', color: 'var(--text-secondary)' }}>{r.reason || '—'}</span></td>
                  <td>
                    <span className={`badge ${style.badge}`}>
                      {style.icon} {r.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td>
                      {r.status === 'PENDING' ? (
                        <div className="flex gap-1">
                          <button className="btn btn-icon btn-ghost" title="Approve" onClick={() => handleAction(r.id, 'approve')}
                            style={{ color: 'var(--success)' }}>
                            <Check size={16} />
                          </button>
                          <button className="btn btn-icon btn-ghost" title="Reject" onClick={() => handleAction(r.id, 'reject')}
                            style={{ color: 'var(--danger)' }}>
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted text-sm" style={{ padding: '0 0.5rem' }}>—</span>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
