'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, AlertTriangle } from '@/lib/icons'

const BLOBS = [
  { size: 600, x: '15%', y: '10%', color: 'rgba(124, 58, 237, 0.12)', duration: 18 },
  { size: 500, x: '70%', y: '60%', color: 'rgba(59, 130, 246, 0.10)', duration: 22 },
  { size: 400, x: '50%', y: '80%', color: 'rgba(6, 182, 212, 0.08)', duration: 16 },
]

function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return mounted
}

export default function LoginPage() {
  const router = useRouter()
  const mounted = useMounted()
  const cardRef = useRef<HTMLDivElement>(null)
  const [accessKey, setAccessKey] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 })
  const [particles, setParticles] = useState<{ id: number; left: number; size: number; delay: number; duration: number; drift: number }[]>([])

  useEffect(() => {
    setParticles(
      Array.from({ length: 35 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 1.5 + Math.random() * 2.5,
        delay: Math.random() * 8,
        duration: 6 + Math.random() * 8,
        drift: (Math.random() - 0.5) * 40,
      }))
    )
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const px = (e.clientX - cx) / (rect.width / 2)
    const py = (e.clientY - cy) / (rect.height / 2)
    setTilt({ x: px * 8, y: py * -8 })
    const gx = ((e.clientX - rect.left) / rect.width) * 100
    const gy = ((e.clientY - rect.top) / rect.height) * 100
    setGlowPos({ x: gx, y: gy })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
  }

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
    } catch (err) {
      const e = err as { message?: string; code?: string }
      setError(e.message || 'An unexpected error occurred')
      setErrorCode(e.code || '')
      setLoading(false)
    }
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        padding: '1rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Animated Blobs ── */}
      {BLOBS.map((blob, i) => (
        <div
          key={i}
          className="login-blob"
          style={{
            position: 'absolute',
            width: blob.size,
            height: blob.size,
            left: blob.x,
            top: blob.y,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${blob.color}, transparent 70%)`,
            animation: `blob-morph-${i} ${blob.duration}s ease-in-out infinite alternate`,
            willChange: 'transform, border-radius',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* ── Particles ── */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="login-particle"
          style={{
            position: 'absolute',
            bottom: '-10px',
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'rgba(167, 139, 250, 0.3)',
            animation: `particle-rise ${p.duration}s ease-in-out ${p.delay}s infinite`,
            '--drift': `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}

      {/* ── Glass Card ── */}
      <div
        ref={cardRef}
        className="login-card"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          padding: '2.5rem',
          borderRadius: 20,
          background: 'rgba(15, 15, 26, 0.6)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(42, 42, 69, 0.5)',
          transform: mounted
            ? `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) translateY(0)`
            : 'perspective(1000px) rotateX(0) rotateY(0) translateY(20px)',
          opacity: mounted ? 1 : 0,
          transition: 'transform 0.1s ease-out, opacity 0.6s ease-out, translateY 0.6s ease-out',
        }}
      >
        {/* Card glow */}
        <div
          className="login-card-glow"
          style={{
            position: 'absolute',
            top: -1, left: -1, right: -1, bottom: -1,
            borderRadius: 21,
            background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(124, 58, 237, 0.15), transparent 60%)`,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div
            className="login-logo"
            style={{
              textAlign: 'center',
              marginBottom: '2rem',
              animation: mounted ? 'none' : undefined,
            }}
          >
            <div className="login-logo-ring" style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              margin: '0 auto 1rem',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div className="login-logo-pulse" />
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'linear-gradient(135deg, var(--brand-purple), var(--brand-purple-dark))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                color: 'white',
                position: 'relative',
                zIndex: 1,
                animation: 'logo-float 3s ease-in-out infinite',
                boxShadow: '0 0 30px rgba(124, 58, 237, 0.3)',
              }}>
                🐂
              </div>
            </div>
            <h1 className="login-title" style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
              background: 'linear-gradient(135deg, var(--text-primary), var(--brand-purple-light))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Welcome to OxThread
            </h1>
            <p className="text-muted text-sm">
              Enter your credentials to continue
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="alert alert-error mb-4 text-sm"
              style={{
                animation: 'shake 0.4s ease-in-out',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <AlertTriangle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div>{error}</div>
                  {errorCode && (
                    <div style={{
                      marginTop: '0.375rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: 6,
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#f87171',
                      letterSpacing: '0.03em',
                    }}>
                      Code: {errorCode}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Access Key</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input login-input"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="OXT-..."
                  required
                  style={{ paddingLeft: '2.5rem' }}
                />
                <span style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                }}>
                  🔑
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                />
                <span style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                }}>
                  🔒
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-toggle-pw"
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
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full justify-center mt-2"
              disabled={loading}
              style={{
                padding: '0.75rem',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {loading && (
                <span style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                  animation: 'shimmer 1.5s infinite',
                }} />
              )}
              {loading ? (
                <span className="spinner" style={{ width: 16, height: 16 }} />
              ) : (
                <Lock size={16} />
              )}
              Sign In
            </button>
          </form>

          {/* Footer */}
          <p style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}>
            OxThread v0.1.0
          </p>
        </div>
      </div>

      {/* ── Keyframe Animations ── */}
      <style>{`
        ${BLOBS.map((_, i) => `
        @keyframes blob-morph-${i} {
          0% {
            border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%;
            transform: translate(0, 0) scale(1);
          }
          25% {
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
          }
          50% {
            border-radius: 30% 70% 50% 50% / 50% 60% 40% 50%;
            transform: translate(${i % 2 === 0 ? '30' : '-20'}px, ${i < 2 ? '-30' : '25'}px) scale(${1 + (i * 0.05)});
          }
          75% {
            border-radius: 70% 30% 60% 40% / 40% 70% 30% 60%;
          }
          100% {
            border-radius: 50% 50% 40% 60% / 55% 45% 55% 45%;
            transform: translate(-15px, 15px) scale(1);
          }
        }
        `).join('')}

        @keyframes particle-rise {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 0.4;
          }
          100% {
            transform: translateY(-100vh) translateX(var(--drift));
            opacity: 0;
          }
        }

        @keyframes logo-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }

        .login-card-glow {
          transition: background 0.3s ease;
        }

        .login-input {
          transition: box-shadow 0.25s ease, border-color 0.25s ease;
        }

        .login-input:focus {
          box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.25), 0 0 20px rgba(124, 58, 237, 0.1);
          border-color: var(--brand-purple);
        }

        .login-toggle-pw:hover {
          color: var(--text-secondary) !important;
        }

        .login-logo-ring::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: conic-gradient(
            from 0deg,
            transparent,
            rgba(124, 58, 237, 0.3),
            rgba(59, 130, 246, 0.3),
            transparent
          );
          animation: logo-spin 4s linear infinite;
        }

        @keyframes logo-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
