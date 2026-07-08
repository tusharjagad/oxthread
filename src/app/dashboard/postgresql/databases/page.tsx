'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Database, Server, Plus, Check, X } from '@/lib/icons'
import Link from 'next/link'

interface DatabaseInfo {
  id: string
  name: string
  owner: string | null
  size: string | null
  connections: number | null
  serverId: string
  serverName?: string
}

function CreateDatabaseModal({ servers, onClose, onCreated }: { servers: { id: string; name: string }[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ serverId: '', name: '', owner: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    if (!form.serverId || !form.name) { setError('Server and database name are required'); return }
    setLoading(true)
    const res = await fetch('/api/postgres/databases', {
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
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>Create Database</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Server *</label>
            <select className="form-select" value={form.serverId} onChange={(e) => setForm(f => ({ ...f, serverId: e.target.value }))}>
              <option value="">-- Select Server --</option>
              {servers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Database Name *</label>
            <input className="form-input font-mono" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="my_database" />
            <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>Lowercase letters, numbers, and underscores only</p>
          </div>
          <div className="form-group">
            <label className="form-label">Owner (optional)</label>
            <input className="form-input font-mono" value={form.owner} onChange={(e) => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="postgres" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Database size={15} />}
            Create Database
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DatabasesPage() {
  const [servers, setServers] = useState<Array<{ id: string; name: string }>>([])
  const [selectedServer, setSelectedServer] = useState('')
  const [databases, setDatabases] = useState<DatabaseInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [created, setCreated] = useState(0)

  useEffect(() => {
    fetch('/api/postgres/servers')
      .then((r) => r.json())
      .then((d) => setServers(d.servers || []))
      .catch(() => {})
  }, [])

  const discover = useCallback(async () => {
    if (!selectedServer) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/postgres/servers/${selectedServer}/databases`)
      const data = await res.json()
      if (!res.ok) { setError(data.error); setDatabases([]); return }
      setDatabases(data.databases || [])
    } catch {
      setError('Failed to discover databases')
    }
    setLoading(false)
  }, [selectedServer])

  useEffect(() => { if (selectedServer) discover() }, [discover, selectedServer])

  return (
    <div className="animate-fadein">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Database size={24} style={{ color: 'var(--brand-purple)' }} /> Database Discovery
          </h1>
          <p className="page-subtitle">Browse databases on registered PostgreSQL servers</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={15} /> Create Database
        </button>
      </div>

      <div className="card mb-4">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Select Server</label>
            <select className="form-select" value={selectedServer} onChange={(e) => setSelectedServer(e.target.value)}>
              <option value="">-- Choose a server --</option>
              {servers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <button className="btn btn-secondary" onClick={discover} disabled={!selectedServer || loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Discover
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      {!selectedServer && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Server size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p>Select a server to discover databases</p>
          <p className="text-sm" style={{ marginTop: '0.5rem' }}>
            No servers? <Link href="/dashboard/postgresql/servers" style={{ color: 'var(--brand-purple-light)' }}>Register one first</Link>
          </p>
        </div>
      )}

      {selectedServer && !loading && databases.length === 0 && !error && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          No databases found on this server
        </div>
      )}

      {databases.length > 0 && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Database Name</th>
                <th>Owner</th>
                <th>Size</th>
                <th>Connections</th>
                <th>Server</th>
              </tr>
            </thead>
            <tbody>
              {databases.map((db, idx) => (
                <tr key={db.name || idx}>
                  <td style={{ fontWeight: 500 }}>{db.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{db.owner || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{db.size || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{db.connections ?? '—'}</td>
                  <td>
                    <span className="text-sm text-muted">
                      {servers.find((s) => s.id === selectedServer)?.name || selectedServer}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateDatabaseModal servers={servers} onClose={() => setShowCreate(false)} onCreated={() => setCreated(c => c + 1)} />
      )}
    </div>
  )
}
