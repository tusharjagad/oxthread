'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, RefreshCw, Server, Wifi, WifiOff, Trash2, X, Check, Database } from '@/lib/icons'
import Link from 'next/link'

interface PostgresServer {
  id: string
  name: string
  environment: string
  host: string
  port: number
  sslEnabled: boolean
  ownerTeam: string | null
  secretRef: string
  status: string
  createdAt: string
  _count?: { pgUsers: number }
}

const ENV_COLORS: Record<string, string> = {
  development: 'badge-info',
  staging: 'badge-warning',
  production: 'badge-purple',
  dr: 'badge-danger',
}

function CreateServerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '', host: '', port: '5432', environment: 'development',
    sslEnabled: true, ownerTeam: '', secretRef: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    if (!form.name || !form.host || !form.secretRef) {
      setError('Name, host, and secret reference are required')
      return
    }
    setLoading(true)
    const res = await fetch('/api/postgres/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, port: parseInt(form.port) }),
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
          <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>Register PostgreSQL Server</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Server Name *</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="prod-db-01" />
            </div>
            <div className="form-group">
              <label className="form-label">Environment</label>
              <select className="form-select" value={form.environment} onChange={(e) => setForm(f => ({ ...f, environment: e.target.value }))}>
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
                <option value="dr">Disaster Recovery</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Host *</label>
              <input className="form-input font-mono" value={form.host} onChange={(e) => setForm(f => ({ ...f, host: e.target.value }))} placeholder="postgres.example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Port</label>
              <input type="number" className="form-input" value={form.port} onChange={(e) => setForm(f => ({ ...f, port: e.target.value }))} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Secret Reference *</label>
              <input className="form-input font-mono" value={form.secretRef} onChange={(e) => setForm(f => ({ ...f, secretRef: e.target.value }))} placeholder="PROD_DB_URL" />
            </div>
            <div className="form-group">
              <label className="form-label">Owner Team</label>
              <input className="form-input" value={form.ownerTeam} onChange={(e) => setForm(f => ({ ...f, ownerTeam: e.target.value }))} placeholder="Platform Engineering" />
            </div>
          </div>
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" id="ssl" checked={form.sslEnabled} onChange={(e) => setForm(f => ({ ...f, sslEnabled: e.target.checked }))} />
            <label htmlFor="ssl" className="form-label" style={{ cursor: 'pointer' }}>Enable SSL</label>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Check size={15} />}
            Register Server
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ServersPage() {
  const [servers, setServers] = useState<PostgresServer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/postgres/servers?search=${encodeURIComponent(search)}`)
    const data = await res.json()
    setServers(data.servers || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete server "${name}"? This action cannot be undone.`)) return
    const res = await fetch(`/api/postgres/servers/${id}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  const testConnection = async (id: string) => {
    await fetch(`/api/postgres/servers/${id}/test`, { method: 'POST' })
    load()
  }

  return (
    <div className="animate-fadein">
      {showCreate && <CreateServerModal onClose={() => setShowCreate(false)} onCreated={load} />}

      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Server size={24} style={{ color: 'var(--brand-blue)' }} /> PostgreSQL Servers
          </h1>
          <p className="page-subtitle">{total} registered servers</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={load}>
            <RefreshCw size={14} />
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Register Server
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="search-wrapper" style={{ maxWidth: 380 }}>
          <Search size={15} className="search-icon" />
          <input className="form-input search-input" placeholder="Search by server name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Host</th>
              <th>Environment</th>
              <th>Status</th>
              <th>SSL</th>
              <th>Team</th>
              <th>Users</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}><div style={{ height: 20, background: 'var(--bg-elevated)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} /></td>
                  ))}
                </tr>
              ))
            ) : servers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No servers registered. Click &ldquo;Register Server&rdquo; to add one.
                </td>
              </tr>
            ) : servers.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link href={`/dashboard/postgresql/servers/${s.id}`} style={{ color: 'var(--brand-blue)', textDecoration: 'none', fontWeight: 500 }}>
                    {s.name}
                  </Link>
                </td>
                <td><span className="font-mono text-sm">{s.host}:{s.port}</span></td>
                <td><span className={`badge ${ENV_COLORS[s.environment] || 'badge-muted'}`}>{s.environment}</span></td>
                <td>
                  <span className={`badge ${s.status === 'ACTIVE' ? 'badge-success' : s.status === 'ERROR' ? 'badge-danger' : 'badge-muted'}`}>
                    {s.status === 'ACTIVE' ? <><Wifi size={11} /> Active</> : s.status === 'ERROR' ? <><WifiOff size={11} /> Error</> : 'Inactive'}
                  </span>
                </td>
                <td><span className={`badge ${s.sslEnabled ? 'badge-success' : 'badge-muted'}`}>{s.sslEnabled ? 'Yes' : 'No'}</span></td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{s.ownerTeam || '—'}</td>
                <td style={{ textAlign: 'center' }}>{s._count?.pgUsers ?? 0}</td>
                <td>
                  <div className="flex gap-1">
                    <button className="btn btn-icon btn-ghost" title="Test Connection" onClick={() => testConnection(s.id)}>
                      <Wifi size={15} />
                    </button>
                    <Link href={`/dashboard/postgresql/servers/${s.id}`} className="btn btn-icon btn-ghost" title="View Details">
                      <Database size={15} />
                    </Link>
                    <button className="btn btn-icon btn-danger" title="Delete" onClick={() => remove(s.id, s.name)}>
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
