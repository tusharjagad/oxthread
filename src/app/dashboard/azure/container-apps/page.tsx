'use client'

import { FormEvent, useState } from 'react'
import { CheckCircle, Cloud, Loader2, Save, Server, XCircle } from '@/lib/icons'

type Mode = 'create' | 'update'

export default function ContainerAppsPage() {
  const [mode, setMode] = useState<Mode>('create')
  const [name, setName] = useState('')
  const [resourceGroup, setResourceGroup] = useState('')
  const [location, setLocation] = useState('northeurope')
  const [managedEnvironmentId, setManagedEnvironmentId] = useState('')
  const [containerName, setContainerName] = useState('app')
  const [image, setImage] = useState('')
  const [cpu, setCpu] = useState('0.25')
  const [memory, setMemory] = useState('0.5Gi')
  const [targetPort, setTargetPort] = useState('')
  const [includeRedis, setIncludeRedis] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    const common = { resourceGroup, containerName, image, cpu, memory }
    const endpoint = mode === 'create'
      ? '/api/azure/container-apps'
      : `/api/azure/container-apps/${encodeURIComponent(name)}`
    const body = mode === 'create'
      ? { ...common, name, location, managedEnvironmentId, targetPort: targetPort || undefined, includeRedis }
      : common

    try {
      const response = await fetch(endpoint, { method: mode === 'create' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'The request failed')
      setSuccess(data.message)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The request failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 960 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Azure Container Apps</h1>
          <p className="page-subtitle">Create a Container App or update a container image and resources from OxThread.</p>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button className={`btn ${mode === 'create' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('create')} type="button"><Cloud size={16} />Create Container App</button>
          <button className={`btn ${mode === 'update' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('update')} type="button"><Server size={16} />Update Container App</button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><XCircle size={16} />{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} />{success}</div>}

        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group"><label className="form-label">Container App name</label><input className="form-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="cow-solver-staging" required /></div>
            <div className="form-group"><label className="form-label">Resource group</label><input className="form-input" value={resourceGroup} onChange={(event) => setResourceGroup(event.target.value)} placeholder="northeurope-rg" required /></div>
            {mode === 'create' && <>
              <div className="form-group"><label className="form-label">Azure region</label><input className="form-input" value={location} onChange={(event) => setLocation(event.target.value)} required /></div>
              <div className="form-group"><label className="form-label">Ingress target port (optional)</label><input className="form-input" value={targetPort} onChange={(event) => setTargetPort(event.target.value)} inputMode="numeric" placeholder="8080" /></div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Managed Environment resource ID</label><input className="form-input" value={managedEnvironmentId} onChange={(event) => setManagedEnvironmentId(event.target.value)} placeholder="/subscriptions/.../resourceGroups/.../providers/Microsoft.App/managedEnvironments/..." required /></div>
            </>}
            <div className="form-group"><label className="form-label">Container name</label><input className="form-input" value={containerName} onChange={(event) => setContainerName(event.target.value)} required /></div>
            <div className="form-group"><label className="form-label">Image</label><input className="form-input" value={image} onChange={(event) => setImage(event.target.value)} placeholder="myregistry.azurecr.io/my-app:tag" required /></div>
            <div className="form-group"><label className="form-label">CPU</label><input className="form-input" value={cpu} onChange={(event) => setCpu(event.target.value)} inputMode="decimal" required /></div>
            <div className="form-group"><label className="form-label">Memory</label><input className="form-input" value={memory} onChange={(event) => setMemory(event.target.value)} placeholder="0.5Gi" required /></div>
          </div>

          {mode === 'create' && <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', margin: '0.25rem 0 1.25rem', fontSize: '0.86rem', cursor: 'pointer' }}><input type="checkbox" checked={includeRedis} onChange={(event) => setIncludeRedis(event.target.checked)} />Add Redis sidecar (Redis 7.4, AOF enabled)</label>}

          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{saving ? 'Submitting...' : mode === 'create' ? 'Create Container App' : 'Update Container App'}</button>
        </form>
      </div>
    </div>
  )
}
