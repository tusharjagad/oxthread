'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useAuth } from '@/contexts/auth-context'
import { Bell, Search, LogOut, ChevronDown, User } from '@/lib/icons'
import { useRouter } from 'next/navigation'
import oxThreadLogo from '../../../logo.png'

export function Topbar() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  return (
    <header className="topbar">
      {/* Logo */}
      <div className="flex items-center" style={{ minWidth: 'var(--sidebar-width)', marginLeft: '-1.5rem', padding: '0 1.25rem' }}>
        <Image
          src={oxThreadLogo}
          alt="OxThread"
          priority
          className="object-contain"
          style={{ width: 76, height: 76, margin: '-13px -6px -13px -10px' }}
        />
      </div>

      {/* Search */}
      <div className="search-wrapper" style={{ flex: 1, maxWidth: 400 }}>
        <Search size={15} className="search-icon" />
        <input
          className="form-input search-input"
          placeholder="Search anything..."
          style={{ height: 36, fontSize: '0.85rem' }}
        />
        <kbd style={{
          position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
          fontSize: '0.65rem', color: 'var(--text-muted)',
          background: 'var(--bg-card)', border: '1px solid var(--bg-border)',
          borderRadius: 4, padding: '0.1rem 0.4rem',
        }}>⌘K</kbd>
      </div>

      <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
        {/* Notifications */}
        <button className="btn btn-icon btn-ghost" style={{ position: 'relative' }}>
          <Bell size={18} />
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--brand-cyan)',
          }} />
        </button>

        {/* User Menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost flex items-center gap-2"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ padding: '0.35rem 0.75rem' }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--brand-blue), var(--brand-cyan))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0,
            }}>
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.2 }}>
                {user?.username ?? 'Admin'}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.2 }}>
                {user?.role ?? 'Super Admin'}
              </div>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              background: 'var(--bg-card)', border: '1px solid var(--bg-border)',
              borderRadius: 10, padding: '0.5rem', width: 180, zIndex: 200,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }} className="animate-slideup">
              <button
                className="nav-link"
                style={{ width: '100%', borderRadius: 6 }}
                onClick={() => { router.push('/dashboard/profile'); setMenuOpen(false) }}
              >
                <User size={14} /> Profile
              </button>
              <div className="divider" style={{ margin: '0.25rem 0' }} />
              <button
                className="nav-link"
                style={{ width: '100%', borderRadius: 6, color: 'var(--danger)' }}
                onClick={() => { logout(); setMenuOpen(false) }}
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
