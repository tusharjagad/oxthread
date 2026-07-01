'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  GitBranch, Play, CheckCircle, XCircle, ExternalLink, ArrowLeft,
  Trash2, Search, Loader2, Clock, Activity, ChevronLeft, ChevronRight,
} from '@/lib/icons'

interface Pipeline {
  id: string
  appName: string
  repoUrl: string
  framework: string
  containerApp: string
  status: string
  createdAt: string
  updatedAt: string
  githubOrg: string | null
  githubRepo: string | null
  githubBranch: string | null
  lastDeployedAt: string | null
  deploymentUrl: string | null
  version: number
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  GENERATED: { label: 'Generated', cls: 'badge-info' },
  PUSHED: { label: 'Pushed', cls: 'badge-warning' },
  DEPLOYED: { label: 'Deployed', cls: 'badge-success' },
  FAILED: { label: 'Failed', cls: 'badge-danger' },
}

export default function PipelineListPage() {
  const router = useRouter()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) })
      const res = await fetch(`/api/pipelines?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPipelines(data.pipelines || [])
        setTotal(data.total || 0)
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { load(page) }, [page, load])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/pipelines/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPipelines(prev => prev.filter(p => p.id !== id))
        setTotal(prev => prev - 1)
      }
    } catch {} finally {
      setDeletingId(null)
      setConfirmDelete(null)
    }
  }

  const totalPages = Math.ceil(total / limit)
  const filtered = search
    ? pipelines.filter(p =>
        p.appName.toLowerCase().includes(search.toLowerCase()) ||
        p.repoUrl.toLowerCase().includes(search.toLowerCase()) ||
        p.framework.toLowerCase().includes(search.toLowerCase())
      )
    : pipelines

  return (
    <div className="animate-fadein">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/dashboard/pipelines" className="btn btn-ghost btn-sm" style={{ padding: '0.35rem' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="page-title flex items-center gap-2">
              <Activity size={22} style={{ color: 'var(--brand-purple-light)' }} /> All Pipelines
            </h1>
            <p className="page-subtitle">{total} total pipeline{total !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Link href="/dashboard/pipelines" className="btn btn-primary btn-sm">
          <Play size={14} /> New Pipeline
        </Link>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            className="form-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, repo, or framework..."
            style={{ border: 'none', padding: '0.35rem 0', fontSize: '0.85rem', flex: 1, background: 'transparent' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.2rem 0.4rem' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <Loader2 size={24} className="animate-spin" style={{ opacity: 0.4 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <GitBranch size={28} style={{ opacity: 0.3 }} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {search ? 'No pipelines match your search' : 'No pipelines created yet'}
          </p>
          {!search && (
            <Link href="/dashboard/pipelines" className="btn btn-primary" style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Play size={14} /> Create Your First Pipeline
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 70px',
              gap: 0, fontSize: '0.73rem', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.04em', color: 'var(--text-muted)',
              padding: '0.65rem 1rem', borderBottom: '1px solid var(--bg-border)',
              background: 'var(--bg-secondary)',
            }}>
              <span>Name</span>
              <span>Repository</span>
              <span>Framework</span>
              <span>Status</span>
              <span>Created</span>
              <span style={{ textAlign: 'center' }}>Actions</span>
            </div>

            {/* Table rows */}
            {filtered.map((p, i) => (
              <div key={p.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 70px',
                gap: 0, fontSize: '0.82rem',
                padding: '0.55rem 1rem',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--bg-border)' : 'none',
                transition: 'background 0.1s',
                cursor: 'pointer',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => router.push(`/dashboard/pipelines/${p.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: p.status === 'DEPLOYED' ? 'var(--success)' :
                      p.status === 'FAILED' ? 'var(--danger)' :
                      p.status === 'PUSHED' ? '#f59e0b' : 'var(--text-muted)',
                  }} />
                  <strong style={{ fontSize: '0.85rem' }}>{p.appName}</strong>
                  {p.version > 1 && (
                    <span className="badge badge-purple" style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem' }}>v{p.version}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--brand-purple-light)', fontSize: '0.8rem' }}>
                  <GitBranch size={12} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.githubOrg}/{p.githubRepo}
                  </span>
                </div>
                <div style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{p.framework || '—'}</div>
                <div>
                  <span className={`badge ${STATUS_BADGE[p.status]?.cls || 'badge-info'}`} style={{ fontSize: '0.7rem' }}>
                    {STATUS_BADGE[p.status]?.label || p.status}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  <span title={formatDate(p.createdAt)}>{timeAgo(p.createdAt)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                  {confirmDelete === p.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}
                        disabled={deletingId === p.id}
                        className="btn btn-danger btn-sm"
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem', lineHeight: 1.2 }}
                      >
                        {deletingId === p.id ? <Loader2 size={10} className="animate-spin" /> : 'Yes'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(null) }}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem', lineHeight: 1.2 }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id) }}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '0.3rem', color: 'var(--text-muted)' }}
                      title="Delete pipeline"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
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
              <span style={{ color: 'var(--text-muted)' }}>
                Page {page} of {totalPages}
              </span>
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
        </>
      )}
    </div>
  )
}
