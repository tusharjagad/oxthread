'use client'

import { FormEvent, useState } from 'react'
import { CheckCircle, Database, Loader2, Save, Server, XCircle } from '@/lib/icons'

interface RedisDetails {
  containers: { name: string; image: string }[]
  volumes: string[]
}

export default function RedisContainerPage() {
  const [containerApp, setContainerApp] = useState('')
  const [resourceGroup, setResourceGroup] = useState('')
  const [containerName, setContainerName] = useState('redis-settle')
  const [image, setImage] = useState('docker.io/redis:7.4')
  const [cpu, setCpu] = useState('0.25')
  const [memory, setMemory] = useState('0.5Gi')
  const [volumeName, setVolumeName] = useState('')
  const [subPath, setSubPath] = useState('redis-data')
  const [details, setDetails] = useState<RedisDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function fetchContainerApp(clearFeedback = true) {
    if (!containerApp || !resourceGroup) return
    setLoading(true)
    if (clearFeedback) {
      setError('')
      setSuccess('')
    }
    setDetails(null)
    try {
      const response = await fetch(`/api/azure/container-apps/${encodeURIComponent(containerApp)}/redis?resourceGroup=${encodeURIComponent(resourceGroup)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load the Container App')
      setDetails(data)
      const existing = data.containers.find((container: { name: string }) => container.name === containerName)
      if (existing?.image) setImage(existing.image)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the Container App')
    } finally {
      setLoading(false)
    }
  }

  async function loadContainerApp(event: FormEvent) {
    event.preventDefault()
    await fetchContainerApp()
  }

  async function saveRedis() {
    if (!details) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`/api/azure/container-apps/${encodeURIComponent(containerApp)}/redis`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceGroup, containerName, image, cpu, memory, volumeName: volumeName || undefined, subPath }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save Redis')
      setSuccess(data.action === 'updated'
        ? 'Redis already exists. Its configuration was updated and Azure is creating a new revision.'
        : data.message)
      await fetchContainerApp(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save Redis')
    } finally {
      setSaving(false)
    }
  }

  const redisExists = details?.containers.some((container) => container.name === containerName) ?? false

  return (
    <div className="page-container" style={{ maxWidth: 980 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Redis Container</h1>
          <p className="page-subtitle">Add or update a Redis sidecar without changing your other Container App containers.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <form onSubmit={loadContainerApp} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Container App name</label>
            <input className="form-input" value={containerApp} onChange={(event) => setContainerApp(event.target.value)} placeholder="cow-solver-staging" required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Resource group</label>
            <input className="form-input" value={resourceGroup} onChange={(event) => setResourceGroup(event.target.value)} placeholder="northeurope-rg" required />
          </div>
          <button className="btn btn-secondary" type="submit" disabled={loading} style={{ height: 42 }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Server size={16} />}
            {loading ? 'Loading...' : 'Load App'}
          </button>
        </form>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}><XCircle size={16} />{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}><CheckCircle size={16} />{success}</div>}

      {details && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Database size={18} style={{ color: 'var(--brand-purple-light)' }} />
            <div>
              <h2 style={{ fontSize: '1rem', margin: 0 }}>{redisExists ? 'Update Redis' : 'Add Redis'}</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>Saving creates a new Azure Container Apps revision.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Container name</label>
              <input className="form-input" value={containerName} onChange={(event) => setContainerName(event.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Redis image</label>
              <input className="form-input" value={image} onChange={(event) => setImage(event.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">CPU</label>
              <input className="form-input" value={cpu} onChange={(event) => setCpu(event.target.value)} inputMode="decimal" />
            </div>
            <div className="form-group">
              <label className="form-label">Memory</label>
              <input className="form-input" value={memory} onChange={(event) => setMemory(event.target.value)} placeholder="0.5Gi" />
            </div>
            <div className="form-group">
              <label className="form-label">Persistent volume (optional)</label>
              <input className="form-input" list="container-volumes" value={volumeName} onChange={(event) => setVolumeName(event.target.value)} placeholder="Select an existing volume" />
              <datalist id="container-volumes">{details.volumes.map((volume) => <option key={volume} value={volume} />)}</datalist>
            </div>
            <div className="form-group">
              <label className="form-label">Volume subpath</label>
              <input className="form-input" value={subPath} onChange={(event) => setSubPath(event.target.value)} disabled={!volumeName} />
            </div>
          </div>

          <div style={{ padding: '0.8rem', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.55, marginBottom: '1rem' }}>
            Redis starts with AOF enabled, repairs an existing AOF manifest before startup, and uses a 384 MB no-eviction memory limit. Select a listed persistent volume to store data at <code>/data</code>; leaving it blank uses ephemeral storage.
          </div>

          <button className="btn btn-primary" onClick={saveRedis} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : redisExists ? 'Update Redis Container' : 'Create Redis Container'}
          </button>
        </div>
      )}
    </div>
  )
}
