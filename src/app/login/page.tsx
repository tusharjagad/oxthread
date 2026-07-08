'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, AlertTriangle } from '@/lib/icons'

export default function LoginPage() {
  const router = useRouter()
  const [accessKey, setAccessKey] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKey, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        setErrorCode(data.code || '')
        setLoading(false)
        return
      }

      if (data.requireTotp) {
        router.push('/login/totp')
      } else {
        window.location.href = '/dashboard'
      }
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          padding: '2.5rem',
          borderRadius: 12,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--brand-purple), var(--brand-purple-dark))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              fontSize: '1.25rem',
              color: 'white',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            O
          </div>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Sign in to OxThread
          </h1>
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              marginTop: '0.375rem',
              margin: '0.375rem 0 0 0',
            }}
          >
            Enter your credentials to access the dashboard
          </p>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              padding: '0.75rem',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              marginBottom: '1.25rem',
              fontSize: '0.8125rem',
              color: '#f87171',
            }}
          >
            <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <div>{error}</div>
              {errorCode && (
                <div
                  style={{
                    marginTop: '0.375rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: 4,
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    fontFamily: 'monospace',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    display: 'inline-block',
                  }}
                >
                  {errorCode}
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
              Access Key
            </label>
            <input
              type="text"
              className="form-input"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              placeholder="OXT-..."
              required
              autoComplete="username"
              style={{
                padding: '0.625rem 0.75rem',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                style={{
                  padding: '0.625rem 2.25rem 0.625rem 0.75rem',
                  fontSize: '0.875rem',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full justify-center"
            disabled={loading}
            style={{
              padding: '0.625rem',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {loading ? (
              <span className="spinner" style={{ width: 16, height: 16 }} />
            ) : (
              <Lock size={16} />
            )}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          OxThread v0.1.0
        </p>
      </div>
    </div>
  )
}
