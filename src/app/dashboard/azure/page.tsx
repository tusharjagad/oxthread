import Link from 'next/link'
import { Cloud, Database, Server } from '@/lib/icons'

const resources = [
  {
    title: 'Container Apps',
    description: 'Create a Container App, deploy its first container, or update a container image and resources.',
    href: '/dashboard/azure/container-apps',
    icon: Server,
  },
  {
    title: 'Redis Container',
    description: 'Add or update a Redis sidecar while preserving the other containers in an existing app.',
    href: '/dashboard/azure/redis',
    icon: Database,
  },
]

export default function AzureResourcesPage() {
  return (
    <div className="page-container" style={{ maxWidth: 960 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Azure Resources</h1>
          <p className="page-subtitle">Create and manage Azure Container Apps from OxThread.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {resources.map((resource) => {
          const Icon = resource.icon
          return (
            <Link key={resource.href} href={resource.href} className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block', padding: '1.25rem' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59,130,246,0.12)', marginBottom: '1rem' }}>
                <Icon size={20} style={{ color: 'var(--brand-purple-light)' }} />
              </div>
              <h2 style={{ fontSize: '1rem', margin: '0 0 0.45rem' }}>{resource.title}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.55, margin: 0 }}>{resource.description}</p>
            </Link>
          )
        })}
      </div>

      <div className="card" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
        <Cloud size={18} style={{ color: 'var(--brand-purple-light)' }} />
        Your Azure service principal must have access to the selected subscription, resource group, and managed environment.
      </div>
    </div>
  )
}
