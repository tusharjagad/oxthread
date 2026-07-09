'use client'

import { useState, useEffect } from 'react'
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
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.04 }}>
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
          width: '45vw', height: '45vw', top: '-20%', right: '-10%',
          background: `radial-gradient(circle, rgba(36,107,255,0.1), transparent 70%)`,
          borderRadius: '50%',
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          width: '35vw', height: '35vw', bottom: '-15%', left: '-8%',
          background: `radial-gradient(circle, rgba(17,216,195,0.08), transparent 70%)`,
          borderRadius: '50%',
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          width: '20vw', height: '20vw', top: '40%', left: '30%',
          background: `radial-gradient(circle, rgba(36,107,255,0.04), transparent 70%)`,
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

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

export default function LoginPage() {
  const router = useRouter()
  const [accessKey, setAccessKey] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showAccessKey, setShowAccessKey] = useState(false)
  const [remember, setRemember] = useState(false)
  const [tapCount, setTapCount] = useState(0)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [particles, setParticles] = useState<{ left: string; top: string; w: number; h: number; bg: string; dur: string; delay: string }[]>([])

  useEffect(() => {
    setMounted(true)
    const handleMouse = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      })
    }
    window.addEventListener('mousemove', handleMouse)
    setParticles(
      Array.from({ length: 24 }).map(() => ({
        left: `${5 + Math.random() * 90}%`,
        top: `${-5 + Math.random() * 10}%`,
        w: 1.5 + Math.random() * 2.5,
        h: 1.5 + Math.random() * 2.5,
        bg: `rgba(36, 107, 255, ${0.08 + Math.random() * 0.2})`,
        dur: `${8 + Math.random() * 12}s`,
        delay: `${Math.random() * 8}s`,
      }))
    )
    return () => window.removeEventListener('mousemove', handleMouse)
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
      <div className="fixed inset-0 pointer-events-none" style={{ transform: `translate(${mousePos.x * 3}px, ${mousePos.y * 3}px)` }}>
        <GridPattern />
        <BackgroundGlow />
        {mounted && (
          <div className="absolute inset-0 overflow-hidden">
            {particles.map((p, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: p.left,
                  top: p.top,
                  width: p.w,
                  height: p.h,
                  background: p.bg,
                  '--dur': p.dur,
                  '--delay': p.delay,
                  animation: 'particle-float var(--dur) ease-in-out var(--delay) infinite',
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Left Panel (40%) ── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="hidden lg:flex flex-col w-[44%] min-h-screen relative z-10 pl-14 pr-8 xl:pl-16 xl:pr-10 2xl:pl-[72px] 2xl:pr-12"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: GRADIENT, boxShadow: '0 4px 24px rgba(36,107,255,0.3)' }}
          >
            <span className="text-white font-bold text-[22px] tracking-tight">O</span>
          </motion.div>
          <div>
            <div className="font-semibold text-xl text-white/85 tracking-tight">
              oxThread
            </div>
            <div className="text-[0.65rem] font-medium tracking-widest uppercase mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Enterprise DevOps Automation Platform
            </div>
          </div>
        </motion.div>

        {/* Hero */}
        <div className="flex-1 flex flex-col justify-center -mt-[72px]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="mb-12"
          >
            <h1
              className="font-bold leading-[1.1] tracking-tight"
              style={{
                fontSize: 'clamp(38px, 4vw, 54px)',
              }}
            >
              <span className="text-white/88">Automate.</span>
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: GRADIENT,
                }}
              >
                Deploy.
              </span>
              <br />
              <span className="text-white/88">Monitor.</span>
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: GRADIENT,
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
          className="pb-2"
        >
          <LoginIllustration />
        </motion.div>
      </motion.div>

      {/* ── Right Panel (60%) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="flex-1 min-h-screen flex items-center justify-center relative z-10 p-5 sm:p-8"
        style={{ background: DARK_SURFACE }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.02 }}>
          <defs>
            <pattern id="g2" width={48} height={48} patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke={BRAND_BLUE} strokeWidth={0.5} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g2)" />
        </svg>
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
          <div>
            <span className="font-semibold text-base text-white/80">oxThread</span>
          </div>
        </motion.div>

        {/* Right panel card glow */}
        <div className="absolute pointer-events-none" style={{
          width: '80%', height: '80%', top: '10%', left: '10%',
          background: 'radial-gradient(circle, rgba(36,107,255,0.06), transparent 70%)',
        }} />
        <div className="absolute pointer-events-none" style={{
          width: '50%', height: '50%', bottom: '5%', right: '5%',
          background: 'radial-gradient(circle, rgba(17,216,195,0.04), transparent 70%)',
        }} />

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full mt-6 lg:mt-8"
          style={{ maxWidth: 560 }}
        >
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: 28,
              background: 'rgba(15, 23, 40, 0.6)',
              backdropFilter: 'blur(64px)',
              WebkitBackdropFilter: 'blur(64px)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow:
                '0 50px 100px -24px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 60px rgba(36,107,255,0.05), 0 0 2px rgba(17,216,195,0.06)',
              padding: '48px 48px 40px',
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
                background: 'linear-gradient(180deg, rgba(255,255,255,0.04), transparent)',
                transform: 'rotate(25deg)',
              }}
            />
            {/* Subtle top line highlight */}
            <div
              className="absolute pointer-events-none"
              style={{
                width: '40%', height: '1px', top: 0, left: '30%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
              }}
            />

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              style={{ position: 'relative', zIndex: 1 }}
            >
              {/* Status indicator */}
              <motion.div variants={itemVariants} className="flex items-center gap-2 mb-6">
                <motion.span
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ background: '#10B981' }}
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="text-[0.7rem] font-medium tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  All Systems Operational
                </span>
              </motion.div>

              {/* Card header */}
              <motion.div variants={itemVariants}>
                <h2 className="text-[40px] font-bold leading-[1.1] tracking-tight text-white/90">
                  Welcome Back
                </h2>
                <p
                  className="mt-3"
                  style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, lineHeight: 1.5 }}
                >
                  Sign in to your account to continue
                </p>
              </motion.div>

              {/* Error */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div variants={itemVariants} className="mt-6">
                    <ErrorAlert error={error} errorCode={errorCode} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-5">
                {/* Access Key */}
                <motion.div variants={itemVariants} className="flex flex-col gap-2">
                  <label
                    className="text-[0.8125rem] font-semibold tracking-wide"
                    style={{ color: 'rgba(255,255,255,0.85)' }}
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
                        type={showAccessKey ? 'text' : 'password'}
                        value={accessKey}
                        onChange={(e) => setAccessKey(e.target.value)}
                        placeholder="OXT-••••••••••••••••"
                        required
                        autoComplete="username"
                        className="w-full bg-transparent text-[0.9375rem] outline-none"
                        style={{
                          padding: '21px 46px 21px 46px',
                          color: 'rgba(255,255,255,0.9)',
                          fontFamily: 'var(--font-mono, monospace)',
                        }}
                      />
                      <motion.button
                        type="button"
                        onClick={() => setShowAccessKey(!showAccessKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center p-1.5 rounded-lg"
                        style={{ color: 'rgba(255,255,255,0.2)' }}
                        whileHover={{ color: 'rgba(255,255,255,0.5)' }}
                        whileTap={{ scale: 0.9 }}
                        tabIndex={-1}
                        aria-label={showAccessKey ? 'Hide access key' : 'Show access key'}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div
                            key={showAccessKey ? 'off' : 'on'}
                            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                            transition={{ duration: 0.2 }}
                          >
                            {showAccessKey ? <EyeOff size={16} /> : <Eye size={16} />}
                          </motion.div>
                        </AnimatePresence>
                      </motion.button>
                    </div>
                  </FocusWrapper>
                </motion.div>

                {/* Password */}
                <motion.div variants={itemVariants} className="flex flex-col gap-2">
                  <label
                    className="text-[0.8125rem] font-semibold tracking-wide"
                    style={{ color: 'rgba(255,255,255,0.85)' }}
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
                          padding: '21px 46px 21px 46px',
                          color: 'rgba(255,255,255,0.9)',
                        }}
                      />
                      <motion.button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center p-1.5 rounded-lg transition-colors"
                        style={{ color: 'rgba(255,255,255,0.2)' }}
                        whileHover={{ color: 'rgba(255,255,255,0.5)' }}
                        whileTap={{ scale: 0.9 }}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div
                            key={showPassword ? 'off' : 'on'}
                            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                            transition={{ duration: 0.2 }}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </motion.div>
                        </AnimatePresence>
                      </motion.button>
                    </div>
                  </FocusWrapper>
                </motion.div>

                {/* Remember + Forgot */}
                <motion.div variants={itemVariants} className="flex items-center justify-between mt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                    <motion.div
                      className="w-[20px] h-[20px] rounded-[6px] flex items-center justify-center"
                      style={{
                        background: remember ? BRAND_BLUE : 'transparent',
                        border: `1.5px solid ${remember ? BRAND_BLUE : 'rgba(255,255,255,0.12)'}`,
                      }}
                      animate={remember ? {
                        background: BRAND_BLUE,
                        borderColor: BRAND_BLUE,
                      } : {
                        background: 'transparent',
                        borderColor: 'rgba(255,255,255,0.12)',
                      }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setRemember(!remember)}
                    >
                      <AnimatePresence>
                        {remember && (
                          <motion.svg
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            width="10" height="10" viewBox="0 0 10 10" fill="none"
                          >
                            <motion.path
                              d="M2 5L4 7L8 3"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.2 }}
                            />
                          </motion.svg>
                        )}
                      </AnimatePresence>
                    </motion.div>
                    <span className="text-[0.8125rem]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Remember me
                    </span>
                  </label>
                  <motion.button
                    type="button"
                    className="text-[0.8125rem] font-medium transition-colors"
                    style={{ color: 'rgba(36,107,255,0.5)' }}
                    whileHover={{ color: BRAND_BLUE }}
                    tabIndex={-1}
                  >
                    <span className="hover:underline underline-offset-2 decoration-blue-500/30">
                      Forgot password?
                    </span>
                  </motion.button>
                </motion.div>

                {/* Sign In */}
                <motion.div variants={itemVariants}>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    onTap={() => setTapCount(c => c + 1)}
                    className="w-full flex items-center justify-center gap-2.5 py-[15px] rounded-xl font-semibold text-[0.9375rem] text-white relative overflow-hidden cursor-pointer"
                    style={{
                      background: GRADIENT,
                      boxShadow: '0 6px 24px rgba(36,107,255,0.25)',
                    }}
                    whileHover={!loading ? {
                      scale: 1.015,
                      y: -1,
                      boxShadow: '0 12px 40px rgba(36,107,255,0.4), 0 0 30px rgba(36,107,255,0.12)',
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
                      <motion.span className="flex items-center gap-2.5 relative" whileHover={{ gap: 14 }}>
                        {/* Ripple */}
                        <AnimatePresence mode="popLayout">
                          {tapCount > 0 && (
                            <motion.span
                              key={tapCount}
                              className="absolute inset-0 rounded-xl pointer-events-none"
                              initial={{ scale: 0, opacity: 0.3 }}
                              animate={{ scale: 2.5, opacity: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                              style={{ background: 'rgba(255,255,255,0.08)' }}
                            />
                          )}
                        </AnimatePresence>
                        <motion.span whileHover={{ rotate: -8 }}>
                          <Lock size={16} />
                        </motion.span>
                        Sign In
                        <motion.span
                          animate={{ x: [0, 3, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <ChevronRight size={16} className="opacity-50" />
                        </motion.span>
                      </motion.span>
                    )}
                  </motion.button>
                </motion.div>
              </form>

              {/* Footer */}
              <div className="mt-14 pt-5 text-center border-t border-white/[0.03]">
                <motion.div variants={itemVariants}>
                  <p className="text-[0.65rem] tracking-wider" style={{ color: 'rgba(255,255,255,0.15)' }}>
                    &copy; 2026 oxThread
                  </p>
                  <p className="text-[0.58rem] tracking-wider mt-1.5" style={{ color: 'rgba(255,255,255,0.1)' }}>
                    Enterprise DevOps Automation
                  </p>
                  <p className="text-[0.55rem] tracking-wider mt-1" style={{ color: 'rgba(255,255,255,0.07)' }}>
                    Version 1.0.0
                  </p>
                </motion.div>
              </div>
            </motion.div>
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
        input::placeholder {
          color: rgba(255,255,255,0.25) !important;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #0C1628 inset !important;
          -webkit-text-fill-color: rgba(255,255,255,0.9) !important;
          caret-color: rgba(255,255,255,0.9) !important;
          transition: background-color 5000s ease-in-out 0s !important;
        }
      `}</style>
    </div>
  )
}

function FocusWrapper({ children }: { children: React.ReactNode }) {
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      className="rounded-xl transition-all duration-200"
      style={{
        background: '#0C1628',
        border: `1px solid ${focused ? 'rgba(36,107,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: focused ? '0 0 0 2px rgba(36,107,255,0.25), 0 0 30px rgba(36,107,255,0.1)' : 'none',
      }}
      animate={{ y: hovered || focused ? -1 : 0 }}
      transition={{ duration: 0.2 }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </motion.div>
  )
}
