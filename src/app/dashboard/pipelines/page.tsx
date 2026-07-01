'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  GitBranch, Play, CheckCircle, XCircle, ExternalLink, GitFork,
  FileText, Search, Server, MapPin, HardDrive, Code2, Shield, Globe,
  BookOpen, ArrowRight, Activity, Loader2, AlertTriangle,
} from '@/lib/icons'

interface Repo {
  id: number
  fullName: string
  name: string
  owner: string
  private: boolean
  defaultBranch: string
}

interface Branch {
  name: string
  commitSha: string
}

interface CaDetails {
  name: string
  resourceGroup: string
  acrName: string
  acrLoginServer: string
  location: string
}

interface SetupCheck {
  ok: boolean
  message: string
  blocking?: boolean
}

interface SetupResult {
  ok: boolean
  checks: Record<string, SetupCheck>
}

export default function PipelinesPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [repos, setRepos] = useState<Repo[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedRepo, setSelectedRepo] = useState('')
  const [appName, setAppName] = useState('')
  const [framework, setFramework] = useState('nextjs')
  const [branch, setBranch] = useState('main')
  const [containerApp, setContainerApp] = useState('')
  const [generating, setGenerating] = useState(false)
  const [reposLoading, setReposLoading] = useState(true)
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Azure Container App verification
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [caDetails, setCaDetails] = useState<CaDetails | null>(null)

  // Step 2: OIDC + GitHub setup verification
  const [setupVerifying, setSetupVerifying] = useState(false)
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null)

  // Step 3: Result
  const [result, setResult] = useState<{
    push: { success: boolean; commitSha?: string; error?: string }
    webhook: { success: boolean; error?: string }
    federatedCredential: { success: boolean }
    secretsSetup: { success: boolean }
    auditLog: { action: string; status: string; details: string }[]
    summary: { filesGenerated: number; dockerfileGenerated: boolean }
    repoUrl: string
    branch: string
    pipeline?: { id: string; version: number }
  } | null>(null)

  useEffect(() => {
    fetch('/api/github/repos')
      .then((r) => r.json())
      .then((data) => { setRepos(data); setReposLoading(false) })
      .catch(() => setReposLoading(false))
  }, [])

  useEffect(() => { setMounted(true) }, [])

  const handleRepoSelect = useCallback(async (fullName: string) => {
    setSelectedRepo(fullName)
    setBranch('main')
    setBranches([])
    setFramework('nextjs')
    setError('')
    setVerified(false)
    setCaDetails(null)
    setSetupResult(null)

    if (!fullName) return

    const [owner, repo] = fullName.split('/')
    setAppName(repo)

    setBranchesLoading(true)
    try {
      const res = await fetch(`/api/github/repos/${owner}/${repo}/branches`)
      if (res.ok) {
        const data: Branch[] = await res.json()
        setBranches(data)
        setBranch(data[0]?.name || 'main')
      }
    } catch {} finally {
      setBranchesLoading(false)
    }

    setDetecting(true)
    try {
      const detectRes = await fetch(`/api/github/repos/${owner}/${repo}/detect`)
      if (detectRes.ok) {
        const data = await detectRes.json()
        setFramework(data.detectedFramework || 'nextjs')
      }
    } catch {} finally {
      setDetecting(false)
    }
  }, [])

  const handleBranchSelect = useCallback(async (branchName: string) => {
    setBranch(branchName)
    setSetupResult(null)
    if (!selectedRepo) return
    const [owner, repo] = selectedRepo.split('/')
    setDetecting(true)
    try {
      const detectRes = await fetch(`/api/github/repos/${owner}/${repo}/detect?branch=${branchName}`)
      if (detectRes.ok) {
        const data = await detectRes.json()
        setFramework(data.detectedFramework || 'nextjs')
      }
    } catch {} finally {
      setDetecting(false)
    }
  }, [selectedRepo])

  // Step 1: Verify Container App
  const verify = async () => {
    setError('')
    setVerified(false)
    setCaDetails(null)
    setSetupResult(null)
    setResult(null)
    if (!selectedRepo || !appName) {
      setError('Select a repo and enter app name')
      return
    }
    const caName = containerApp || appName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    setVerifying(true)
    try {
      const res = await fetch(`/api/azure/container-apps/${encodeURIComponent(caName)}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Container app not found')
        return
      }
      const data = await res.json()
      setCaDetails(data)
      setVerified(true)
    } catch {
      setError('Failed to verify container app')
    } finally {
      setVerifying(false)
    }
  }

  // Step 2: Verify OIDC + GitHub setup
  const verifySetup = async () => {
    setError('')
    setSetupResult(null)
    if (!selectedRepo || !caDetails) return
    const [githubOrg, githubRepo] = selectedRepo.split('/')
    const caName = containerApp || appName.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    setSetupVerifying(true)
    try {
      const params = new URLSearchParams({
        githubOrg,
        githubRepo,
        githubBranch: branch,
        containerApp: caName,
      })
      const res = await fetch(`/api/pipelines/verify-setup?${params}`)
      const data = await res.json()
      setSetupResult(data)
    } catch {
      setError('Failed to verify setup')
    } finally {
      setSetupVerifying(false)
    }
  }

  // Step 3: Create Pipeline
  const generate = async () => {
    setError('')
    if (!selectedRepo || !appName) {
      setError('Select a repo and enter app name')
      return
    }
    const [githubOrg, githubRepo] = selectedRepo.split('/')

    setGenerating(true)
    try {
      const res = await fetch('/api/pipelines/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName,
          framework,
          containerApp: containerApp || appName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          githubOrg,
          githubRepo,
          githubBranch: branch,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setResult(data)
    } catch {
      setError('Failed to generate pipeline')
    } finally {
      setGenerating(false)
    }
  }

  const handleContainerAppChange = (value: string) => {
    setContainerApp(value)
    setVerified(false)
    setCaDetails(null)
    setSetupResult(null)
  }

  const handleAppNameChange = (value: string) => {
    setAppName(value)
    setVerified(false)
    setCaDetails(null)
    setSetupResult(null)
  }

  interface ExistingPipeline {
    id: string
    appName: string
    repoUrl: string
    framework: string
    status: string
    createdAt: string
    lastDeployedAt: string | null
    deploymentUrl: string | null
  }

  const [existingPipelines, setExistingPipelines] = useState<ExistingPipeline[]>([])
  const [pipelinesLoading, setPipelinesLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pipelines?limit=5')
      .then(r => r.json())
      .then(d => setExistingPipelines(d.pipelines || []))
      .catch(() => {})
      .finally(() => setPipelinesLoading(false))
  }, [])

  const statusColor: Record<string, string> = {
    GENERATED: '#6b6b90', PUSHED: '#f59e0b', DEPLOYED: '#10b981', FAILED: '#ef4444',
  }

  if (!mounted) return null

  const caName = containerApp || appName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const repoUrl = selectedRepo ? `https://github.com/${selectedRepo}` : '#'
  const allSetupOk = setupResult?.ok ?? false

  const renderCheckRow = (key: string, check: SetupCheck) => (
    <div key={key} style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.45rem 0.55rem', borderRadius: 6,
      fontSize: '0.78rem', background: 'var(--bg-secondary)',
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 5, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: check.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
      }}>
        {check.ok
          ? <CheckCircle size={11} style={{ color: 'var(--success)' }} />
          : <XCircle size={11} style={{ color: 'var(--danger)' }} />}
      </div>
      <span style={{ flex: 1, color: check.ok ? 'var(--text-primary)' : 'var(--danger)', lineHeight: 1.4 }}>
        {check.message}
      </span>
    </div>
  )

  return (
    <div className="animate-fadein">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <GitBranch size={24} style={{ color: 'var(--brand-purple-light)' }} /> CI/CD Pipeline Generator
          </h1>
          <p className="page-subtitle">Verify each step in order, then deploy</p>
        </div>
      </div>

      {/* Existing Pipelines */}
      {!pipelinesLoading && existingPipelines.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem', padding: '0.85rem 1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
            <Activity size={15} style={{ color: 'var(--brand-purple-light)' }} />
            <h2 style={{ fontWeight: 700, fontSize: '0.85rem', flex: 1 }}>Your Pipelines</h2>
            <Link href="/dashboard/pipelines/list" style={{ fontSize: '0.78rem', color: 'var(--brand-purple-light)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 500 }}>
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {existingPipelines.map((p) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.5rem 0.65rem', borderRadius: 6, fontSize: '0.8rem',
                background: 'var(--bg-secondary)', cursor: 'pointer',
              }} onClick={() => router.push(`/dashboard/pipelines/${p.id}`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor[p.status] || '#6b6b90' }} />
                  <strong>{p.appName}</strong>
                  <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{p.framework}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className={`badge ${p.status === 'DEPLOYED' ? 'badge-success' : p.status === 'FAILED' ? 'badge-danger' : p.status === 'PUSHED' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem' }}>
                    {p.status}
                  </span>
                  <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Config Form */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
            <GitBranch size={15} style={{ color: 'var(--brand-purple-light)' }} />
            <h2 style={{ fontWeight: 700, fontSize: '0.9rem' }}>Pipeline Configuration</h2>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">GitHub Repository</label>
            {reposLoading ? (
              <div style={{ padding: '0.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <Loader2 size={12} className="animate-spin" /> Loading repos...
              </div>
            ) : (
              <select
                className="form-select"
                value={selectedRepo}
                onChange={(e) => handleRepoSelect(e.target.value)}
              >
                <option value="">Select a repository...</option>
                {repos.map((r) => (
                  <option key={r.id} value={r.fullName}>
                    {r.fullName}{r.private ? ' 🔒' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Branch</label>
            {branchesLoading ? (
              <div style={{ padding: '0.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <Loader2 size={12} className="animate-spin" /> Loading branches...
              </div>
            ) : (
              <select
                className="form-select"
                value={branch}
                onChange={(e) => handleBranchSelect(e.target.value)}
                disabled={!selectedRepo}
              >
                {branches.length === 0 && <option value="">Select repo first</option>}
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Framework
              {detecting && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>detecting...</span>}
            </label>
            <select
              className="form-select"
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
            >
              <option value="nextjs">Next.js</option>
              <option value="react">React</option>
              <option value="nodejs">Node.js</option>
              <option value="python">Python</option>
              <option value="fastapi">FastAPI</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Application Name</label>
            <input
              className="form-input"
              value={appName}
              onChange={(e) => handleAppNameChange(e.target.value)}
              placeholder="auto-filled from repo"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Azure Container App Name</label>
            <input
              className="form-input"
              value={containerApp}
              onChange={(e) => handleContainerAppChange(e.target.value)}
              placeholder="auto-generated from app name"
            />
          </div>

          <button
            className="btn btn-primary w-full"
            onClick={verify}
            disabled={verifying || !selectedRepo || !appName}
            style={{ marginTop: '0.25rem' }}
          >
            {verifying ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {verifying ? 'Verifying...' : 'Verify Container App'}
          </button>
        </div>

        {/* Right Panel */}
        {result ? (
          /* ====== STEP 3 RESULT ====== */
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '0.9rem 1.25rem',
              borderBottom: '1px solid var(--bg-border)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {result.push.success ? <CheckCircle size={14} style={{ color: 'var(--success)' }} /> : <XCircle size={14} style={{ color: 'var(--danger)' }} />}
                </div>
                <strong style={{ fontSize: '0.9rem' }}>Deployment Result</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={`badge ${result.push.success ? 'badge-success' : 'badge-danger'}`}>
                  {result.push.success ? 'Pipeline Created' : 'Failed'}
                </span>
                <a
                  href={result.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.8rem', color: 'var(--brand-purple-light)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  View Repo <ExternalLink size={12} />
                </a>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <div style={{ padding: '1rem 1.15rem', borderRight: '1px solid var(--bg-border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.65rem', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Push</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {result.push.success ? <CheckCircle size={12} style={{ color: 'var(--success)' }} /> : <XCircle size={12} style={{ color: 'var(--danger)' }} />}
                      <a
                        href={`${result.repoUrl}/commit/${result.push.commitSha}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--brand-purple-light)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {result.push.commitSha?.slice(0, 7) || 'Failed'}
                      </a>
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.65rem', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Webhook</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {result.webhook.success ? <CheckCircle size={12} style={{ color: 'var(--success)' }} /> : <XCircle size={12} style={{ color: 'var(--text-muted)' }} />}
                      <span style={{ fontWeight: 600 }}>{result.webhook.success ? 'Registered' : 'Skipped'}</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.65rem', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>OIDC Federated</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {result.federatedCredential?.success ? <CheckCircle size={12} style={{ color: 'var(--success)' }} /> : <XCircle size={12} style={{ color: 'var(--text-muted)' }} />}
                      <span style={{ fontWeight: 600 }}>{result.federatedCredential?.success ? 'Configured' : 'Failed'}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ padding: '1rem 1.15rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.65rem', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Secrets</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {result.secretsSetup?.success ? <CheckCircle size={12} style={{ color: 'var(--success)' }} /> : <XCircle size={12} style={{ color: 'var(--text-muted)' }} />}
                      <span style={{ fontWeight: 600 }}>{result.secretsSetup?.success ? 'Configured' : 'Failed'}</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.65rem', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Files</span>
                    <span style={{ fontWeight: 600 }}>
                      <FileText size={12} style={{ marginRight: 4 }} /> {result.summary.filesGenerated} pushed
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.65rem', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Dockerfile</span>
                    <a
                      href={`${result.repoUrl}/blob/${result.branch}/Dockerfile`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontWeight: 600, color: result.summary.dockerfileGenerated ? 'var(--brand-purple-light)' : 'var(--text-muted)', textDecoration: 'none' }}
                    >
                      {result.summary.dockerfileGenerated ? 'Generated' : 'Existing'} <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid var(--bg-border)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {result.pipeline?.id && (
                  <button
                    onClick={() => router.push(`/dashboard/pipelines/${result.pipeline!.id}`)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--brand-purple-light)', padding: '0.25rem 0.5rem', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Activity size={11} /> View Details
                  </button>
                )}
                <a
                  href={`${result.repoUrl}/actions`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--brand-purple-light)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  Workflow <ExternalLink size={11} />
                </a>
                {result.push.commitSha && (
                  <span>· <a href={`${result.repoUrl}/commit/${result.push.commitSha}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-purple-light)', textDecoration: 'none' }}>{result.push.commitSha.slice(0, 7)}</a></span>
                )}
              </div>
              <button
                onClick={() => { setResult(null); setVerified(false); setCaDetails(null); setSetupResult(null); setError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--brand-purple-light)', padding: '0.25rem 0.5rem', textDecoration: 'underline' }}
              >
                Create Another
              </button>
            </div>
          </div>
        ) : caDetails ? (
          /* ====== STEP 1 + 2: Azure verified + OIDC/GitHub checks ====== */
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Step indicator */}
            <div style={{
              padding: '0.65rem 1.25rem',
              borderBottom: '1px solid var(--bg-border)',
              background: 'var(--bg-secondary)',
              display: 'flex', alignItems: 'center', gap: '1rem',
              fontSize: '0.78rem',
            }}>
              <span style={{ color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <CheckCircle size={13} /> Azure Verified
              </span>
              <span style={{ color: setupResult ? (setupResult.ok ? 'var(--success)' : 'var(--danger)') : 'var(--text-muted)', fontWeight: setupResult ? 600 : 400, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {setupResult ? (setupResult.ok ? <CheckCircle size={13} /> : <XCircle size={13} />) : <AlertTriangle size={13} />}
                Setup Check
              </span>
            </div>

            {/* Container App Details */}
            <div style={{ padding: '0.85rem 1.15rem', borderBottom: '1px solid var(--bg-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
                <Server size={15} style={{ color: 'var(--success)' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Azure Container App — Verified</span>
                <span className="badge badge-success" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>Ready</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: 5 }}>
                  <Server size={12} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Name:</span>
                  <strong>{caDetails.name}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: 5 }}>
                  <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Region:</span>
                  <span>{caDetails.location}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: 5 }}>
                  <HardDrive size={12} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Resource Group:</span>
                  <span style={{ fontSize: '0.72rem', wordBreak: 'break-all' }}>{caDetails.resourceGroup}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: 5 }}>
                  <HardDrive size={12} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Registry:</span>
                  <span style={{ fontSize: '0.72rem', wordBreak: 'break-all' }}>{caDetails.acrLoginServer}</span>
                </div>
              </div>
            </div>

            {/* OIDC + GitHub Setup Check */}
            <div style={{ padding: '0.85rem 1.15rem', borderBottom: '1px solid var(--bg-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
                <Shield size={15} style={{ color: setupResult ? (setupResult.ok ? 'var(--success)' : 'var(--danger)') : 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Azure OIDC &amp; GitHub Access</span>
                {setupResult && (
                  <span className={`badge ${setupResult.ok ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>
                    {setupResult.ok ? 'All Checks Passed' : 'Issues Found'}
                  </span>
                )}
                {!setupResult && !setupVerifying && (
                  <span className="badge badge-info" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>Pending</span>
                )}
              </div>

              {setupResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {Object.entries(setupResult.checks).map(([key, check]) => renderCheckRow(key, check))}
                </div>
              ) : setupVerifying ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', padding: '1rem' }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Verifying OIDC and GitHub access...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {['OIDC Federated Credential', 'GitHub Secrets API', 'Webhook URL', 'Repo Access'].map((label) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.55rem', borderRadius: 6, fontSize: '0.78rem', background: 'var(--bg-secondary)', opacity: 0.5 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)' }}>
                        <AlertTriangle size={11} style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <span>{label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>not checked</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom action bar */}
            <div style={{
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              background: 'var(--bg-secondary)',
            }}>
              {setupResult?.ok ? (
                <>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    All checks passed. Ready to push workflow to GitHub.
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={generate}
                    disabled={generating}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', fontSize: '0.85rem', flexShrink: 0 }}
                  >
                    {generating ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    {generating ? 'Creating...' : 'Create Pipeline'}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {setupResult && !setupResult.ok
                      ? 'Some checks failed. Fix the issues above, then re-run Verify Setup.'
                      : 'Verify Azure OIDC and GitHub access before creating pipeline.'}
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={verifySetup}
                    disabled={setupVerifying}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', fontSize: '0.85rem', flexShrink: 0 }}
                  >
                    {setupVerifying ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                    {setupVerifying ? 'Verifying...' : 'Run Verify Setup'}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 520, gap: '1.25rem', color: 'var(--text-muted)', padding: '2rem' }}>
            <div style={{ width: 72, height: 72, borderRadius: 16, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GitBranch size={36} style={{ opacity: 0.4 }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>3-Step Deployment</p>
              <p style={{ fontSize: '0.82rem', opacity: 0.65, maxWidth: 300, lineHeight: 1.6, margin: '0 auto' }}>
                <strong>1.</strong> Verify Container App<br />
                <strong>2.</strong> Check OIDC &amp; GitHub access<br />
                <strong>3.</strong> Create Pipeline
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
