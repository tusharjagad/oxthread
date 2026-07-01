'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, KeyRound, Lock, Eye, EyeOff, CheckCircle2, Copy,
  ArrowLeft, Loader2, AlertTriangle, Save, RefreshCw,
} from '@/lib/icons'

interface Profile {
  id: string
  username: string
  accessKey: string
  role: string
  isActive: boolean
  totpEnabled: boolean
  expiry: string | null
  lastLogin: string | null
  createdAt: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tab, setTab] = useState<'details' | 'password' | 'key'>('details')

  // Form state
  const [username, setUsername] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Key regen
  const [regenConfirm, setRegenConfirm] = useState('')
  const [newAccessKey, setNewAccessKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [showAccessKey, setShowAccessKey] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setProfile(data.user)
          setUsername(data.user.username)
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [])

  const updateProfile = async (payload: Record<string, unknown>) => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Update failed')
        return
      }
      if (data.user) {
        setProfile(data.user)
        setUsername(data.user.username)
      }
      if (data.newAccessKey) {
        setNewAccessKey(data.newAccessKey)
      }
      setSuccess(data.message || 'Updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    updateProfile({ currentPassword, newPassword })
  }

  const handleKeyRegen = (e: React.FormEvent) => {
    e.preventDefault()
    if (regenConfirm !== 'REGENERATE') {
      setError('Type REGENERATE to confirm')
      return
    }
    updateProfile({ currentPassword, regenerateKey: true })
    setRegenConfirm('')
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <Loader2 size={20} className="spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Could not load profile</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--brand-purple), var(--brand-blue))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', fontWeight: 700, color: 'white',
        }}>
          {profile.username[0]?.toUpperCase() || 'U'}
        </div>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{profile.username}</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {profile.role.replace(/_/g, ' ')} · Joined {new Date(profile.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div style={{
          padding: '0.65rem 0.85rem', borderRadius: 10, marginBottom: '1rem',
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.85rem', color: '#34d399',
        }}>
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{
          padding: '0.65rem 0.85rem', borderRadius: 10, marginBottom: '1rem',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.85rem', color: '#f87171',
        }}>
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* New access key banner */}
      {newAccessKey && (
        <div className="card" style={{ marginBottom: '1rem', border: '1px solid rgba(245,158,11,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <KeyRound size={16} style={{ color: '#f59e0b', marginTop: 2, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fbbf24' }}>New Access Key Generated</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Save this now — it will not be shown again.
              </p>
            </div>
          </div>
          <div style={{
            padding: '0.65rem 0.85rem', borderRadius: 8,
            background: 'var(--bg-elevated)', fontFamily: 'monospace', fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            wordBreak: 'break-all',
          }}>
            <span>{newAccessKey}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { navigator.clipboard.writeText(newAccessKey); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
              style={{ flexShrink: 0, marginLeft: '0.5rem' }}
            >
              {copied ? <CheckCircle2 size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--bg-border)' }}>
          {([
            { id: 'details', label: 'Details', icon: <User size={14} /> },
            { id: 'password', label: 'Password', icon: <Lock size={14} /> },
            { id: 'key', label: 'Access Key', icon: <KeyRound size={14} /> },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(''); setSuccess('') }}
              style={{
                flex: 1, padding: '0.65rem 1rem', cursor: 'pointer',
                background: 'none', border: 'none',
                borderBottom: tab === t.id ? '2px solid var(--brand-purple)' : '2px solid transparent',
                color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: tab === t.id ? 600 : 400,
                fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                transition: 'all 0.15s',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '1.25rem' }}>
          {tab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Role</label>
                  <div style={{
                    padding: '0.5rem 0.75rem', borderRadius: 8,
                    background: 'var(--bg-elevated)', fontSize: '0.85rem',
                  }}>
                    {profile.role.replace(/_/g, ' ')}
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Status</label>
                  <div style={{
                    padding: '0.5rem 0.75rem', borderRadius: 8,
                    background: profile.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    fontSize: '0.85rem',
                    color: profile.isActive ? '#34d399' : '#f87171',
                  }}>
                    {profile.isActive ? 'Active' : 'Disabled'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Access Key</label>
                  <div style={{
                    padding: '0.5rem 0.75rem', borderRadius: 8,
                    background: 'var(--bg-elevated)', fontSize: '0.8rem',
                    fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span>{showAccessKey ? profile.accessKey : profile.accessKey.slice(0, 4) + '••••••••'}</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowAccessKey(!showAccessKey)}
                      style={{ flexShrink: 0, padding: '0.2rem' }}
                      title={showAccessKey ? 'Hide access key' : 'Show access key'}
                    >
                      {showAccessKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>2FA</label>
                  <div style={{
                    padding: '0.5rem 0.75rem', borderRadius: 8,
                    background: 'var(--bg-elevated)', fontSize: '0.85rem',
                  }}>
                    {profile.totpEnabled ? 'Enabled' : 'Not configured'}
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Last Login</label>
                <div style={{
                  padding: '0.5rem 0.75rem', borderRadius: 8,
                  background: 'var(--bg-elevated)', fontSize: '0.85rem',
                }}>
                  {profile.lastLogin
                    ? new Date(profile.lastLogin).toLocaleDateString([], {
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })
                    : 'Never'}
                </div>
              </div>

              <button
                className="btn btn-primary w-full justify-center mt-2"
                onClick={() => updateProfile({ username })}
                disabled={saving || username === profile.username}
                style={{ padding: '0.6rem' }}
              >
                {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
                Save Changes
              </button>
            </div>
          )}

          {tab === 'password' && (
            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    className="form-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    style={{ paddingRight: '2.25rem' }}
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    style={{ paddingRight: '2.25rem' }}
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    style={{ paddingRight: '2.25rem' }}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full justify-center"
                disabled={saving}
                style={{ padding: '0.6rem' }}
              >
                {saving ? <Loader2 size={15} className="spin" /> : <Lock size={15} />}
                Change Password
              </button>
            </form>
          )}

          {tab === 'key' && (
            <form onSubmit={handleKeyRegen} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                padding: '0.75rem', borderRadius: 8,
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)',
                fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5,
              }}>
                <strong style={{ color: '#fbbf24' }}>⚠️ Security Notice</strong>
                <br />
                Regenerating your access key will invalidate the current one immediately.
                Any service or script using the old key will stop working until updated.
                <br /><br />
                You will need your current password to confirm this action.
              </div>

              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Type <strong style={{ fontFamily: 'monospace', color: 'var(--danger)' }}>REGENERATE</strong> to confirm
                </label>
                <input
                  className="form-input"
                  value={regenConfirm}
                  onChange={(e) => setRegenConfirm(e.target.value)}
                  placeholder="REGENERATE"
                  required
                  style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full justify-center"
                disabled={saving || regenConfirm !== 'REGENERATE'}
                style={{ padding: '0.6rem', opacity: regenConfirm !== 'REGENERATE' ? 0.5 : 1 }}
              >
                {saving ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}
                Regenerate Access Key
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
