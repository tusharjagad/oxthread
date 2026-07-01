'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Database, Server } from '@/lib/icons'
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

export default function DatabasesPage() {
  const [servers, setServers] = useState<Array<{ id: string; name: string }>>([])
  const [selectedServer, setSelectedServer] = useState('')
  const [databases, setDatabases] = useState<DatabaseInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    </div>
  )
}
