'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [sessionTimeout, setSessionTimeout] = useState(30)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        router.push('/login')
        return
      }
      const user = await res.json()
      setUserRole(user.user?.role || null)

      const settingsRes = await fetch('/api/settings')
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setSessionTimeout(data.sessionTimeoutMinutes)
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError('')

    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionTimeoutMinutes: sessionTimeout }),
    })

    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to save')
    }
    setSaving(false)
  }

  if (loading) return <div className="page-container"><p>Loading...</p></div>

  if (userRole !== 'SUPER_ADMIN') {
    return (
      <div className="page-container">
        <h1 className="page-title">Settings</h1>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Access restricted to SUPER_ADMIN.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <h1 className="page-title">System Settings</h1>

      <div className="card" style={{ maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Session Configuration</h2>

        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="sessionTimeout"
            style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}
          >
            Session Timeout (minutes)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <input
              id="sessionTimeout"
              type="number"
              min={1}
              max={1440}
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(Number(e.target.value))}
              className="input"
              style={{ width: '120px' }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Range: 1 – 1440 (24h). Existing sessions keep their original expiry.
            </span>
          </div>
        </div>

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          {saved && (
            <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>Settings saved.</span>
          )}
        </div>
      </div>

      <div className="card" style={{ maxWidth: '600px', marginTop: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>How it works</h2>
        <ul style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.8', paddingLeft: '1.25rem' }}>
          <li>Session timeout controls how long a user stays logged in without activity.</li>
          <li>The JWT token expires after the set duration — users are automatically logged out.</li>
          <li>Changing this value only affects new sessions. Existing sessions keep their original expiry.</li>
          <li>Minimum: 1 minute. Maximum: 1440 minutes (24 hours).</li>
        </ul>
      </div>
    </div>
  )
}
