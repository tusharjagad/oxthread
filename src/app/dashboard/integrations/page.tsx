'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check, X, Cloud, Puzzle } from '@/lib/icons'

function IntegrationCard({ title, desc, icon, status, details, color }: {
  title: string
  desc: string
  icon: React.ReactNode
  status: 'connected' | 'not-configured' | 'checking'
  details: string
  color: string
}) {
  return (
    <div className="card" style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: `${color}22`, display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          color: color,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.15rem' }}>{title}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{desc}</div>
          <div style={{
            padding: '0.6rem 0.75rem', borderRadius: 6, fontSize: '0.8rem',
            background: status === 'connected' ? 'rgba(16,185,129,0.08)' :
              status === 'not-configured' ? 'rgba(239,68,68,0.08)' :
              'rgba(59,130,246,0.08)',
            border: `1px solid ${
              status === 'connected' ? 'rgba(16,185,129,0.2)' :
              status === 'not-configured' ? 'rgba(239,68,68,0.2)' :
              'rgba(59,130,246,0.2)'
            }`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{
              color: status === 'connected' ? '#34d399' :
                status === 'not-configured' ? '#f87171' :
                'var(--text-muted)',
            }}>
              {status === 'connected' ? <Check size={14} /> :
               status === 'not-configured' ? <X size={14} /> :
               <Loader2 size={14} className="animate-spin" />}
              {' '}{status === 'connected' ? 'Connected' : status === 'not-configured' ? 'Not Configured' : 'Checking...'}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{details}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  const [checks, setChecks] = useState<Record<string, { status: 'connected' | 'not-configured' | 'checking'; details: string }>>({
    github: { status: 'checking', details: 'Checking...' },
    azure: { status: 'checking', details: 'Checking...' },
    webhook: { status: 'checking', details: 'Checking...' },
  })

  useEffect(() => {
    async function check() {
      const res = await fetch('/api/integrations/status').catch(() => null)
      const data = res?.ok ? await res.json() : null
      if (data) setChecks(data)
    }
    check()
  }, [])

  return (
    <div className="animate-fadein">
      <div className="page-header">
        <div>
          <h1 className="page-title">Integrations</h1>
          <p className="page-subtitle">Connected services and external API configuration</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <IntegrationCard
          title="GitHub"
          desc="Push files, create secrets, register webhooks, and read repo metadata."
          icon={<div style={{ width: 22, height: 22 }}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg></div>}
          status={checks.github?.status || 'checking'}
          details={checks.github?.details || 'Checking...'}
          color="#6e40c9"
        />

        <IntegrationCard
          title="Azure"
          desc="Look up Container Apps, create OIDC federated credentials, manage resources."
          icon={<Cloud size={22} />}
          status={checks.azure?.status || 'checking'}
          details={checks.azure?.details || 'Checking...'}
          color="#0078d4"
        />

        <IntegrationCard
          title="GitHub Webhook"
          desc="Receives workflow run events to update pipeline deployment status."
          icon={<div style={{ width: 22, height: 22 }}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg></div>}
          status={checks.webhook?.status || 'checking'}
          details={checks.webhook?.details || 'Checking...'}
          color="#6e40c9"
        />

        <div className="card" style={{ maxWidth: 600 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Puzzle size={18} style={{ color: 'var(--brand-purple-light)' }} />
            Environment Variables
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            The following environment variables are used for integrations:
          </p>
          <table className="table">
            <thead>
              <tr>
                <th>Variable</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>GITHUB_TOKEN</code></td><td>GitHub API authentication</td></tr>
              <tr><td><code>AZURE_CLIENT_ID</code></td><td>Azure AD app registration</td></tr>
              <tr><td><code>AZURE_CLIENT_SECRET</code></td><td>Azure client secret</td></tr>
              <tr><td><code>AZURE_TENANT_ID</code></td><td>Azure AD tenant</td></tr>
              <tr><td><code>AZURE_SUBSCRIPTION_ID</code></td><td>Azure subscription</td></tr>
              <tr><td><code>NEXT_PUBLIC_BASE_URL</code></td><td>Webhook callback URL</td></tr>
              <tr><td><code>SCHEDULER_API_KEY</code></td><td>Cron endpoint auth</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
