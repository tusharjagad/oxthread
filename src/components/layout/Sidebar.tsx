'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Database, GitBranch, Cloud, Lock, ShieldCheck,
  ClipboardList, Users, Settings, Puzzle, Cog, ChevronDown,
  Server, FileKey,
} from '@/lib/icons'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  children?: NavItem[]
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navigation: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    title: 'Services',
    items: [
      {
        label: 'PostgreSQL', href: '/dashboard/postgresql', icon: <Database size={16} />,
        children: [
          { label: 'Servers', href: '/dashboard/postgresql/servers', icon: <Server size={14} /> },
          { label: 'Databases', href: '/dashboard/postgresql/databases', icon: <Database size={14} /> },
          { label: 'Users', href: '/dashboard/postgresql/users', icon: <Users size={14} /> },
          { label: 'Access Requests', href: '/dashboard/postgresql/access-requests', icon: <FileKey size={14} /> },
        ],
      },
      { label: 'CI/CD Pipelines', href: '/dashboard/pipelines',   icon: <GitBranch size={16} /> },
      { label: 'Azure Resources', href: '/dashboard/azure',       icon: <Cloud size={16} /> },
    ],
  },
  {
    title: 'Security',
    items: [
      { label: 'Secrets',        href: '/dashboard/secrets',        icon: <Lock size={16} /> },
      { label: 'Access Control', href: '/dashboard/access-control', icon: <ShieldCheck size={16} /> },
      { label: 'Audit Logs',     href: '/dashboard/audit-logs',     icon: <ClipboardList size={16} /> },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Teams',           href: '/dashboard/teams',        icon: <Users size={16} /> },
      { label: 'Integrations',    href: '/dashboard/integrations', icon: <Puzzle size={16} /> },
      { label: 'System Settings', href: '/dashboard/settings',     icon: <Cog size={16} /> },
    ],
  },
]

import { ThemeToggle } from '@/components/ThemeToggle'

export function Sidebar() {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => ({
    'PostgreSQL': pathname.startsWith('/dashboard/postgresql'),
  }))

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <aside className="sidebar">
      {navigation.map((section) => (
        <div key={section.title} className="nav-section">
          <p className="nav-section-label">{section.title}</p>
          {section.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const isExpanded = expandedSections[item.label] ?? pathname.startsWith(item.href + '/')

            if (item.children) {
              return (
                <div key={item.href}>
                  <button
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => toggleSection(item.label)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <span style={{ color: isActive ? 'var(--brand-purple-light)' : 'var(--text-muted)' }}>
                        {item.icon}
                      </span>
                      {item.label}
                    </span>
                    <ChevronDown
                      size={14}
                      style={{
                        color: 'var(--text-muted)',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </button>
                  {isExpanded && (
                    <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                      {item.children.map((child) => {
                        const isChildActive = pathname === child.href
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`nav-link ${isChildActive ? 'active' : ''}`}
                            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                          >
                            <span style={{ color: isChildActive ? 'var(--brand-purple-light)' : 'var(--text-muted)' }}>
                              {child.icon}
                            </span>
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <span style={{ color: isActive ? 'var(--brand-purple-light)' : 'var(--text-muted)' }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
        </div>
      ))}

      {/* Footer */}
      <div style={{ padding: '0.75rem', marginTop: 'auto', borderTop: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          OxThread v1.0.0
        </div>
        <ThemeToggle />
      </div>
    </aside>
  )
}
