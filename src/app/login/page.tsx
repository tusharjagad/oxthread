'use client'

import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Eye, EyeOff, AlertTriangle, Key, ChevronRight } from '@/lib/icons'
import LoginIllustration from '@/components/login-illustration'

const BRAND_BLUE = '#246BFF'
const BRAND_CYAN = '#11D8C3'
const GRADIENT = `linear-gradient(135deg, ${BRAND_BLUE}, ${BRAND_CYAN})`
const DARK_NAVY = '#060B16'
const DARK_SURFACE = '#0F1728'

function GridPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.05 }}>
      <defs>
        <pattern id="g" width={48} height={48} patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke={BRAND_BLUE} strokeWidth={0.5} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)" />
    </svg>
  )
}

function BackgroundGlow() {
  return (
    <>
      <div
        className="fixed pointer-events-none"
        style={{
          width: '40vw', height: '40vw', top: '-15%', right: '-10%',
          background: `radial-gradient(circle, rgba(36,107,255,0.08), transparent 70%)`,
          borderRadius: '50%',
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          width: '30vw', height: '30vw', bottom: '-10%', left: '-5%',
          background: `radial-gradient(circle, rgba(17,216,195,0.06), transparent 70%)`,
          borderRadius: '50%',
        }}
      />
    </>
  )
}

function ErrorAlert({ error, errorCode }: { error: string; errorCode: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
      style={{
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        color: '#fca5a5',
      }}
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div>{error}</div>
        {errorCode && (
          <div
            className="mt-2 px-2.5 py-0.5 rounded text-[0.675rem] font-semibold font-mono inline-block"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              color: '#f87171',
            }}
          >
            {errorCode}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [accessKey, setAccessKey] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
    <div className="flex min-h-screen" style={{ background: DARK_NAVY }}>
      {/* ── Background ── */}
      <div className="fixed inset-0 pointer-events-none">
        <GridPattern />
        <BackgroundGlow />
        {mounted && (
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${5 + Math.random() * 90}%`,
                  top: `${-5 + Math.random() * 10}%`,
                  width: 1.5 + Math.random() * 2,
                  height: 1.5 + Math.random() * 2,
                  background: `rgba(36, 107, 255, ${0.12 + Math.random() * 0.18})`,
                  '--dur': `${6 + Math.random() * 10}s`,
                  '--delay': `${Math.random() * 6}s`,
                  animation: 'particle-float var(--dur) ease-in-out var(--delay) infinite',
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Left Panel (40%) ── */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="hidden lg:flex flex-col w-[40%] min-h-screen relative z-10 p-10 xl:p-14 2xl:p-16"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: GRADIENT, boxShadow: '0 4px 20px rgba(36,107,255,0.25)' }}
          >
            <span className="text-white font-bold text-xl tracking-tight">O</span>
          </div>
          <span className="font-semibold text-lg text-white/85 tracking-tight">
            oxThread
          </span>
        </motion.div>

        {/* Hero */}
        <div className="flex-1 flex flex-col justify-center -mt-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
          >
            <h1
              className="font-bold leading-[1.08] tracking-tight"
              style={{
                fontSize: 'clamp(48px, 5vw, 72px)',
              }}
            >
              <span className="text-white/88">Automate.</span>
              <br />
              <span
                style={{
                  background: GRADIENT,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Deploy.
              </span>
              <br />
              <span className="text-white/88">Monitor.</span>
              <br />
              <span
                style={{
                  background: GRADIENT,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Scale.
              </span>
            </h1>
            <p
              className="mt-8 text-sm leading-relaxed max-w-sm"
              style={{ color: 'rgba(255,255,255,0.38)' }}
            >
              Streamline your DevOps lifecycle with intelligent automation, infrastructure orchestration, deployment pipelines, and real-time observability.
            </p>
          </motion.div>
        </div>

        {/* Illustration */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="pb-4"
        >
          <LoginIllustration />
        </motion.div>
      </motion.div>

      {/* ── Right Panel (60%) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="flex-1 min-h-screen flex items-center justify-center relative z-10 p-5 sm:p-8"
        style={{ background: DARK_SURFACE }}
      >
        {/* Mobile logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:hidden absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: GRADIENT }}>
            <span className="text-white font-bold text-base">O</span>
          </div>
          <span className="font-semibold text-base text-white/80">oxThread</span>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full"
          style={{ maxWidth: 520 }}
        >
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: 28,
              background: 'rgba(15, 23, 40, 0.55)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 30px 60px -15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
              padding: 44,
            }}
          >
            {/* Glass reflection */}
            <div
              className="absolute pointer-events-none"
              style={{
                width: '60%', height: '50%', top: '-25%', right: '-20%',
                background: 'radial-gradient(circle, rgba(36,107,255,0.06), transparent 70%)',
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                width: '80px', height: '200px', top: '-20%', left: '10%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.03), transparent)',
                transform: 'rotate(25deg)',
              }}
            />

            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Card header */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-[22px] font-semibold text-white/90 tracking-tight">
                  Welcome back
                </h2>
                <p
                  className="mt-2.5 text-sm"
                  style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}
                >
                  Sign in to your account to continue
                </p>
              </motion.div>

              {/* Error */}
              <AnimatePresence mode="wait">
                {error && (
                  <div className="mt-6">
                    <ErrorAlert error={error} errorCode={errorCode} />
                  </div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-5">
                {/* Access Key */}
                <div className="flex flex-col gap-2">
                  <label
                    className="text-[0.8125rem] font-medium tracking-wide"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    Access Key
                  </label>
                  <FocusWrapper>
                    <div className="relative">
                      <div
                        className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: 'rgba(255,255,255,0.2)' }}
                      >
                        <Key size={16} />
                      </div>
                      <input
                        type="text"
                        value={accessKey}
                        onChange={(e) => setAccessKey(e.target.value)}
                        placeholder="OXT-..."
                        required
                        autoComplete="username"
                        className="w-full bg-transparent text-[0.9375rem] outline-none"
                        style={{
                          padding: '14px 16px 14px 46px',
                          color: 'rgba(255,255,255,0.9)',
                          fontFamily: 'var(--font-mono, monospace)',
                        }}
                      />
                    </div>
                  </FocusWrapper>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-2">
                  <label
                    className="text-[0.8125rem] font-medium tracking-wide"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    Password
                  </label>
                  <FocusWrapper>
                    <div className="relative">
                      <div
                        className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: 'rgba(255,255,255,0.2)' }}
                      >
                        <Lock size={16} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        autoComplete="current-password"
                        className="w-full bg-transparent text-[0.9375rem] outline-none"
                        style={{
                          padding: '14px 46px 14px 46px',
                          color: 'rgba(255,255,255,0.9)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center p-1.5 rounded-lg transition-colors"
                        style={{ color: 'rgba(255,255,255,0.2)' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </FocusWrapper>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between mt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                    <div
                      className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center transition-all duration-150"
                      style={{
                        background: remember ? BRAND_BLUE : 'transparent',
                        border: `1.5px solid ${remember ? BRAND_BLUE : 'rgba(255,255,255,0.12)'}`,
                      }}
                      onClick={() => setRemember(!remember)}
                    >
                      {remember && (
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          width="10" height="10" viewBox="0 0 10 10" fill="none"
                        >
                          <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </motion.svg>
                      )}
                    </div>
                    <span className="text-[0.8125rem]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Remember me
                    </span>
                  </label>
                  <button
                    type="button"
                    className="text-[0.8125rem] font-medium transition-colors"
                    style={{ color: 'rgba(36,107,255,0.6)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = BRAND_BLUE}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(36,107,255,0.6)'}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign In */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 py-[14px] rounded-xl font-semibold text-[0.9375rem] text-white relative overflow-hidden"
                  style={{
                    background: GRADIENT,
                    boxShadow: '0 6px 24px rgba(36,107,255,0.25)',
                  }}
                  whileHover={!loading ? {
                    scale: 1.01,
                    boxShadow: '0 8px 32px rgba(36,107,255,0.35)',
                  } : {}}
                  whileTap={!loading ? { scale: 0.98 } : {}}
                >
                  {loading && (
                    <motion.div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                  {loading ? (
                    <div className="w-[18px] h-[18px] border-[2px] border-white/25 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock size={16} />
                      Sign In
                      <ChevronRight size={16} className="opacity-50" />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Footer */}
              <p
                className="mt-10 text-center text-xs tracking-wide"
                style={{ color: 'rgba(255,255,255,0.15)' }}
              >
                OxThread v0.1.0
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <style>{`
        @keyframes particle-float {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.3; }
          100% { transform: translateY(calc(-100vh - 20px)) translateX(calc(var(--drift, 0px))); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function FocusWrapper({ children }: { children: React.ReactNode }) {
  const [focused, setFocused] = useState(false)
  return (
    <div
      className="rounded-xl transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${focused ? 'rgba(36,107,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: focused ? '0 0 0 2px rgba(36,107,255,0.15), 0 0 24px rgba(36,107,255,0.06)' : 'none',
      }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
    >
      {children}
    </div>
  )
}
