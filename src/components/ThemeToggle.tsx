'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from '@/lib/icons'

export function ThemeToggle() {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const saved = localStorage.getItem('oxthread-theme') || 'dark'
    setTheme(saved)
    document.documentElement.classList.toggle('dark', saved === 'dark')
    document.documentElement.classList.toggle('light', saved === 'light')
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('oxthread-theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    document.documentElement.classList.toggle('light', next === 'light')
  }

  return (
    <button
      onClick={toggle}
      className="btn btn-icon btn-ghost"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{ width: 32, height: 32 }}
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  )
}
