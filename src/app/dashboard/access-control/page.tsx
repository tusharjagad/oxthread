'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, Shield, Users, Key, Loader2, Check, X } from '@/lib/icons'

const ROLES = [
  { id: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Full system access. Can manage users, delete pipelines, change settings.', color: 'var(--brand-purple-light)' },
  { id: 'ADMIN', label: 'Admin', desc: 'Can create/manage users, servers, pipelines, approve access requests.', color: 'var(--warning)' },
  { id: 'DEVELOPER', label: 'Developer', desc: 'Can create pipelines, view resources, create access requests.', color: 'var(--info)' },
  { id: 'READ_ONLY', label: 'Read Only', desc: 'View-only access to pipelines, servers, databases, and audit logs.', color: 'var(--text-muted)' },
]

export default function AccessControlPage() {
  const [myRole, setMyRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => setMyRole(d?.user?.role || null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <Loader2 size={24} className="animate-spin" style={{ opacity: 0.4 }} />
      </div>
    )
  }

  return (
    <div className="animate-fadein">
      <div className="page-header">
        <div>
          <h1 className="page-title">Access Control</h1>
          <p className="page-subtitle">Role-based permissions and security policies</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Your Role */}
        <div className="card" style={{ maxWidth: 600 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={18} style={{ color: 'var(--brand-purple-light)' }} />
            Your Role
          </h2>
          <div style={{
            padding: '0.75rem 1rem', borderRadius: 8,
            background: 'var(--bg-elevated)', fontSize: '0.9rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>{(myRole || '').replace('_', ' ')}</span>
            <span className={`badge ${myRole === 'SUPER_ADMIN' ? 'badge-purple' : myRole === 'ADMIN' ? 'badge-warning' : myRole === 'DEVELOPER' ? 'badge-info' : 'badge-muted'}`}>
              {myRole}
            </span>
          </div>
        </div>

        {/* Role Definitions */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} style={{ color: 'var(--brand-purple-light)' }} />
            Roles & Permissions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {ROLES.map((r) => (
              <div key={r.id} style={{
                padding: '1rem', borderRadius: 8,
                background: 'var(--bg-elevated)',
                border: myRole === r.id ? '1px solid var(--brand-purple)' : '1px solid transparent',
                display: 'flex', alignItems: 'flex-start', gap: '1rem',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: `${r.color}22`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  color: r.color,
                }}>
                  <ShieldCheck size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.15rem' }}>{r.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.desc}</div>
                </div>
                {myRole === r.id && (
                  <span className="badge badge-purple" style={{ flexShrink: 0 }}>You</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* IP Access Control */}
        <div className="card" style={{ maxWidth: 600 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={18} style={{ color: 'var(--brand-purple-light)' }} />
            IP Access Control
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Restrict API access to specific IP addresses per user. Configured via the Teams page when editing a user.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: 8, background: 'var(--bg-elevated)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--success)' }}>
                <Check size={14} /> Not enforced (optional)
              </div>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: 8, background: 'var(--bg-elevated)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Required Role</div>
              <div style={{ fontSize: '0.85rem' }}>ADMIN+</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
