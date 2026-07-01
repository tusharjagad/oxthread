'use client'

import { useEffect, useState } from 'react'
import { Database, Server, Users, FileKey, ArrowRight } from '@/lib/icons'
import Link from 'next/link'

const QUICK_LINKS = [
  { label: 'Manage Servers', desc: 'Register and manage PostgreSQL servers', icon: <Server size={24} />, href: '/dashboard/postgresql/servers', color: '#3b82f6' },
  { label: 'Discover Databases', desc: 'Browse databases on registered servers', icon: <Database size={24} />, href: '/dashboard/postgresql/databases', color: '#7c3aed' },
  { label: 'Manage Users', desc: 'Create, enable, disable PostgreSQL users', icon: <Users size={24} />, href: '/dashboard/postgresql/users', color: '#06b6d4' },
  { label: 'Access Requests', desc: 'Request or approve database access', icon: <FileKey size={24} />, href: '/dashboard/postgresql/access-requests', color: '#f59e0b' },
]

export default function PostgreSQLHubPage() {
  const [stats, setStats] = useState({ servers: 0, databases: 0, users: 0, pendingRequests: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [sRes, uRes, aRes] = await Promise.all([
          fetch('/api/postgres/servers?limit=1'),
          fetch('/api/postgres/users?limit=1'),
          fetch('/api/postgres/access-requests?limit=1'),
        ])
        const sData = await sRes.json()
        const uData = await uRes.json()
        const aData = await aRes.json()
        setStats({
          servers: sData.total || 0,
          databases: 0,
          users: uData.total || 0,
          pendingRequests: aData.total || 0,
        })
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="animate-fadein">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Database size={24} style={{ color: 'var(--brand-purple)' }} /> PostgreSQL
          </h1>
          <p className="page-subtitle">Self-service PostgreSQL access management</p>
        </div>
      </div>

      <div className="stats-grid mb-6">
        {[
          { label: 'Servers', value: stats.servers, color: '#3b82f6' },
          { label: 'Users', value: stats.users, color: '#06b6d4' },
          { label: 'Databases', value: stats.databases, color: '#7c3aed' },
          { label: 'Pending Requests', value: stats.pendingRequests, color: '#f59e0b' },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ '--accent-color': s.color } as React.CSSProperties}>
            <div className="stat-card-value" style={{ color: s.color }}>
              {loading ? <span style={{ fontSize: '1.5rem' }}>...</span> : s.value}
            </div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {QUICK_LINKS.map((link) => (
          <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer', height: '100%' }}
              onMouseEnter={(e) => { const el = e.currentTarget; el.style.borderColor = link.color; el.style.transform = 'translateY(-2px)' }}
              onMouseLeave={(e) => { const el = e.currentTarget; el.style.borderColor = ''; el.style.transform = '' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${link.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: link.color, flexShrink: 0 }}>
                  {link.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{link.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{link.desc}</div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--text-muted)', marginTop: 4, flexShrink: 0 }} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
