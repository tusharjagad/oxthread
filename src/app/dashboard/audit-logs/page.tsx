'use client'

import { useEffect, useState } from 'react'
import {
  ClipboardList, Search, Filter,
  CheckCircle2, XCircle, Loader2, Clock, ChevronLeft, ChevronRight,
} from '@/lib/icons'

interface AuditLog {
  id: string
  action: string
  resource: string
  resourceId: string | null
  status: string
  ipAddress: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  user?: { username: string } | null
}

const RESOURCE_LABELS: Record<string, string> = {
  auth: 'Auth',
  postgres_servers: 'PostgreSQL',
  postgres_users: 'PostgreSQL',
  pipelines: 'Pipeline',
  secrets: 'Secrets',
  postgres_access_requests: 'Access',
}

const RESOURCE_ICONS: Record<string, string> = {
  auth: '🔐',
  postgres_servers: '🗄️',
  postgres_users: '👤',
  pipelines: '🔧',
  secrets: '🔑',
  postgres_access_requests: '📋',
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getErrorCode(metadata: Record<string, unknown> | null): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const code = (metadata as Record<string, unknown>).code
  return typeof code === 'string' ? code : null
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (debouncedSearch) params.set('action', debouncedSearch)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/audit-logs?${params}`)
      const data = await res.json()
      if (res.ok) {
        setLogs(data.logs)
        setTotal(data.total)
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [page, debouncedSearch, statusFilter])

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ClipboardList size={17} style={{ color: 'var(--brand-purple-light)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 600, letterSpacing: '-0.01em' }}>Audit Logs</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{total} entries</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={13} style={{
              position: 'absolute', left: '0.625rem', top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
            }} />
            <input
              className="form-input"
              placeholder="Search actions..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              style={{ paddingLeft: '1.75rem', fontSize: '0.8rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {['', 'SUCCESS', 'FAILURE', 'WARNING'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={`badge-filter ${statusFilter === s ? 'active' : ''}`}
                style={{
                  padding: '0.3rem 0.65rem', borderRadius: 8, border: '1px solid var(--bg-border)',
                  fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                  background: statusFilter === s ? 'var(--bg-hover)' : 'transparent',
                  color: statusFilter === s ? 'var(--text-primary)' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {loading ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <Loader2 size={20} className="spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.3 }}>📋</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No audit logs found</p>
          </div>
        ) : (
          logs.map((log) => {
            const resLabel = RESOURCE_LABELS[log.resource] || log.resource?.replace(/_/g, ' ') || 'System'
            const resIcon = RESOURCE_ICONS[log.resource] || '📄'
            const errorCode = getErrorCode(log.metadata)

            return (
              <div
                key={log.id}
                className="card"
                style={{
                  padding: '0.75rem 1rem',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  transition: 'background 0.15s',
                  cursor: 'default',
                }}
              >
                {/* Status dot */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: log.status === 'SUCCESS' ? '#10b981'
                    : log.status === 'FAILURE' ? '#ef4444'
                    : log.status === 'WARNING' ? '#f59e0b'
                    : '#3b82f6',
                  opacity: 0.7,
                }} />

                {/* Icon */}
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: 'var(--bg-elevated)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.9rem',
                }}>
                  {resIcon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                      {formatAction(log.action)}
                    </span>
                    <span style={{
                      fontSize: '0.7rem', color: 'var(--text-muted)',
                      background: 'var(--bg-elevated)',
                      padding: '0.1rem 0.45rem', borderRadius: 4,
                    }}>
                      {resLabel}
                    </span>
                    {log.resourceId && (
                      <span style={{
                        fontSize: '0.65rem', color: 'var(--text-muted)',
                        fontFamily: 'monospace',
                      }}>
                        #{log.resourceId.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {log.user?.username || 'system'}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>·</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formatTime(log.createdAt)}
                    </span>
                    {errorCode && (
                      <>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>·</span>
                        <span style={{
                          fontSize: '0.65rem', fontFamily: 'monospace',
                          color: '#f87171', background: 'rgba(239,68,68,0.1)',
                          padding: '0.05rem 0.35rem', borderRadius: 4,
                        }}>
                          {errorCode}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0,
                  padding: '0.2rem 0.55rem', borderRadius: 6,
                  fontSize: '0.7rem', fontWeight: 600,
                  background: log.status === 'SUCCESS' ? 'rgba(16,185,129,0.1)'
                    : log.status === 'FAILURE' ? 'rgba(239,68,68,0.1)'
                    : log.status === 'WARNING' ? 'rgba(245,158,11,0.1)'
                    : 'rgba(59,130,246,0.1)',
                  color: log.status === 'SUCCESS' ? '#34d399'
                    : log.status === 'FAILURE' ? '#f87171'
                    : log.status === 'WARNING' ? '#fbbf24'
                    : '#60a5fa',
                }}>
                  {log.status === 'SUCCESS' && <CheckCircle2 size={10} />}
                  {log.status === 'FAILURE' && <XCircle size={10} />}
                  {log.status === 'IN_PROGRESS' && <Loader2 size={10} />}
                  {log.status === 'WARNING' && <Clock size={10} />}
                  {log.status}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Page {page} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
