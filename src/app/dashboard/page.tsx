'use client'

import { useEffect, useState } from 'react'
import {
  Database, GitBranch, Cloud, Activity, TrendingUp,
  Plus, RefreshCw, CheckCircle2, Clock, Loader2, XCircle,
  UserPlus, FolderGit2, Rocket, KeyRound,
} from '@/lib/icons'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'

interface Stats {
  totalUsers: number
  activePipelines: number
  azureResources: number
  activeRequests: number
}

interface ActivityItem {
  id: string
  action: string
  resource: string
  status: string
  createdAt: string
  user?: { username: string }
}

interface RequestOverview {
  status: string
  count: number
}

const STATUS_COLORS: Record<string, string> = {
  SUCCESS:     '#10b981',
  FAILURE:     '#ef4444',
  WARNING:     '#f59e0b',
  IN_PROGRESS: '#3b82f6',
}

const QUICK_ACTIONS = [
  { label: 'Create PostgreSQL User', desc: 'Add new database user', icon: <UserPlus size={22} />, href: '/dashboard/postgresql', color: '#3b82f6' },
  { label: 'Generate CI/CD Pipeline', desc: 'Create new pipeline', icon: <FolderGit2 size={22} />, href: '/dashboard/pipelines', color: '#7c3aed' },
  { label: 'Deploy to Azure', desc: 'Deploy application', icon: <Rocket size={22} />, href: '/dashboard/azure', color: '#06b6d4' },
  { label: 'Manage Secrets', desc: 'Add or update secrets', icon: <KeyRound size={22} />, href: '/dashboard/secrets', color: '#f59e0b' },
]

function getActionLabel(action: string): string {
  return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [overview, setOverview] = useState<RequestOverview[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard')
      const data = await res.json()
      setStats(data.stats)
      setActivity(data.recentActivity || [])
      setOverview(data.requestOverview || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const statCards = [
    { label: 'PostgreSQL Users', value: stats?.totalUsers ?? 0, delta: '+12 this month', icon: <Database size={18} />, color: '#3b82f6', accent: '#3b82f6' },
    { label: 'CI/CD Pipelines', value: stats?.activePipelines ?? 0, delta: '+8 this month', icon: <GitBranch size={18} />, color: '#7c3aed', accent: '#7c3aed' },
    { label: 'Azure Resources', value: stats?.azureResources ?? 0, delta: '+15 this month', icon: <Cloud size={18} />, color: '#06b6d4', accent: '#06b6d4' },
    { label: 'Pending Access', value: stats?.activeRequests ?? 0, delta: 'Awaiting approval', icon: <Activity size={18} />, color: '#f59e0b', accent: '#f59e0b' },
  ]

  const total = overview.reduce((s, r) => s + r.count, 0)

  return (
    <div className="animate-fadein">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.username ?? 'Admin'} 👋</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {statCards.map((c) => (
          <div key={c.label} className="stat-card" style={{ '--accent-color': c.accent } as React.CSSProperties}>
            <div className="stat-card-icon" style={{ background: `${c.color}22` }}>
              <span style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="stat-card-value" style={{ color: c.color }}>
              {loading ? (
                <span style={{ fontSize: '1.5rem' }}>…</span>
              ) : c.value.toLocaleString()}
            </div>
            <div className="stat-card-label">{c.label}</div>
            <div className="stat-card-delta" style={{ color: 'var(--success)' }}>
              <TrendingUp size={11} /> {c.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Recent Activities */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>Recent Activities</h2>
            <Link href="/dashboard/audit-logs" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: 52, background: 'var(--bg-elevated)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
              ))
            ) : activity.length === 0 ? (
              <p className="text-muted text-sm" style={{ padding: '2rem', textAlign: 'center' }}>No activity yet</p>
            ) : activity.map((item) => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 0.75rem', borderRadius: 8,
                background: 'var(--bg-elevated)',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: STATUS_COLORS[item.status]
                    ? `${STATUS_COLORS[item.status]}22`
                    : 'var(--bg-card)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.status === 'SUCCESS' && <CheckCircle2 size={15} style={{ color: '#10b981' }} />}
                  {item.status === 'FAILURE' && <XCircle size={15} style={{ color: '#ef4444' }} />}
                  {item.status === 'IN_PROGRESS' && <Loader2 size={15} style={{ color: '#3b82f6' }} />}
                  {item.status === 'WARNING' && <Clock size={15} style={{ color: '#f59e0b' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.3 }}>
                    {getActionLabel(item.action)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    By {item.user?.username ?? 'System'} · {timeAgo(item.createdAt)}
                  </div>
                </div>
                <span className={`badge badge-${item.status === 'SUCCESS' ? 'success' : item.status === 'FAILURE' ? 'danger' : 'info'}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Requests Overview */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>Requests Overview</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>This Month</span>
          </div>

          {/* Big total */}
          <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)' }}>
              {loading ? '…' : total}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Total</div>
          </div>

          {/* Donut chart */}
          {!loading && overview.length > 0 && (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={overview}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={70}
                  dataKey="count"
                  nameKey="status"
                  paddingAngle={3}
                >
                  {overview.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status] || '#6b6b90'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 8, fontSize: '0.8rem' }}
                  labelStyle={{ color: 'var(--text-muted)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            {overview.map((r) => (
              <div key={r.status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[r.status] || '#6b6b90' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.status}</span>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  {r.count} ({total ? Math.round((r.count / total) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.875rem' }}>
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--bg-border)',
                borderRadius: 12,
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
              }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = action.color
                  el.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--bg-border)'
                  el.style.transform = 'translateY(0)'
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${action.color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 0.75rem',
                  color: action.color,
                }}>
                  {action.icon}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {action.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {action.desc}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
