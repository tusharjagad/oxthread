'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Server, Wifi, WifiOff, Database, RefreshCw, ArrowLeft, Check, X } from '@/lib/icons'
import Link from 'next/link'

interface ServerDetail {
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
  updatedAt: string
  databases: Array<{
    id: string
    name: string
    owner: string | null
    size: string | null
    connections: number | null
  }>
  _count: { pgUsers: number }
}

export default function ServerDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [server, setServer] = useState<ServerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/postgres/servers/${id}`)
      const data = await res.json()
      setServer(data.server)
    } catch {}
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`/api/postgres/servers/${id}/test`, { method: 'POST' })
      const data = await res.json()
      setTestResult(data)
    } catch (e) {
      setTestResult({ ok: false, error: (e as Error).message })
    }
    setTesting(false)
    load()
  }

  const syncDatabases = async () => {
    try {
      await fetch(`/api/postgres/servers/${id}/databases`, { method: 'POST' })
      load()
    } catch {}
  }

  if (loading) {
    return (
      <div className="animate-fadein" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        Loading server details...
      </div>
    )
  }

  if (!server) {
    return (
      <div className="animate-fadein" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Server not found
      </div>
    )
  }

  return (
    <div className="animate-fadein">
      <Link href="/dashboard/postgresql/servers" className="btn btn-ghost btn-sm mb-4" style={{ display: 'inline-flex' }}>
        <ArrowLeft size={14} /> Back to Servers
      </Link>

      <div className="page-header">
        <div className="flex items-center gap-3">
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Server size={24} style={{ color: 'var(--brand-blue)' }} />
          </div>
          <div>
            <h1 className="page-title">{server.name}</h1>
            <p className="page-subtitle">{server.host}:{server.port} · {server.environment}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={testConnection} disabled={testing}>
            {testing ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Wifi size={14} />}
            Test Connection
          </button>
          <button className="btn btn-secondary btn-sm" onClick={syncDatabases}>
            <RefreshCw size={14} /> Sync Databases
          </button>
        </div>
      </div>

      {testResult && (
        <div className={`alert ${testResult.ok ? 'alert-success' : 'alert-error'} mb-4`}>
          {testResult.ok ? <Check size={16} /> : <X size={16} />}
          {testResult.ok ? 'Connection successful' : `Connection failed: ${testResult.error}`}
        </div>
      )}

      <div className="stats-grid mb-6">
        <div className="stat-card" style={{ '--accent-color': '#3b82f6' } as React.CSSProperties}>
          <div className="stat-card-label">Status</div>
          <div className="stat-card-value" style={{ color: server.status === 'ACTIVE' ? 'var(--success)' : 'var(--danger)', fontSize: '1.25rem' }}>
            <span className={`badge ${server.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.8rem' }}>
              {server.status === 'ACTIVE' ? <><Wifi size={12} /> Active</> : <><WifiOff size={12} /> {server.status}</>}
            </span>
          </div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#7c3aed' } as React.CSSProperties}>
          <div className="stat-card-label">Databases</div>
          <div className="stat-card-value" style={{ color: '#7c3aed', fontSize: '1.5rem' }}>{server.databases.length}</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#06b6d4' } as React.CSSProperties}>
          <div className="stat-card-label">Users</div>
          <div className="stat-card-value" style={{ color: '#06b6d4', fontSize: '1.5rem' }}>{server._count.pgUsers}</div>
        </div>
        <div className="stat-card" style={{ '--accent-color': '#f59e0b' } as React.CSSProperties}>
          <div className="stat-card-label">SSL</div>
          <div className="stat-card-value" style={{ color: '#f59e0b', fontSize: '1.25rem' }}>{server.sslEnabled ? 'Enabled' : 'Disabled'}</div>
        </div>
      </div>

      <div className="card mb-4">
        <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>Server Details</h2>
        <div className="grid-2">
          {[
            { label: 'Host', value: server.host },
            { label: 'Port', value: server.port.toString() },
            { label: 'Environment', value: server.environment },
            { label: 'Secret Ref', value: server.secretRef },
            { label: 'Owner Team', value: server.ownerTeam || '—' },
            { label: 'Created', value: new Date(server.createdAt).toLocaleString() },
          ].map((f) => (
            <div key={f.label} className="form-group">
              <label className="form-label">{f.label}</label>
              <div style={{ padding: '0.5rem 0', fontFamily: f.label === 'Secret Ref' ? 'JetBrains Mono, monospace' : 'inherit', fontSize: '0.875rem' }}>
                {f.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>
            <Database size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Discovered Databases
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={syncDatabases}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {server.databases.length === 0 ? (
          <p className="text-muted text-sm" style={{ padding: '1rem 0', textAlign: 'center' }}>
            No databases discovered. Click &ldquo;Sync Databases&rdquo; to discover.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Database Name</th>
                  <th>Owner</th>
                  <th>Size</th>
                  <th>Connections</th>
                </tr>
              </thead>
              <tbody>
                {server.databases.map((db) => (
                  <tr key={db.id}>
                    <td style={{ fontWeight: 500 }}>{db.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{db.owner || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{db.size || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{db.connections ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
