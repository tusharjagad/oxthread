'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  GitBranch, CheckCircle, XCircle, ExternalLink, Clock,
  Server, FileText, Shield, Globe, Activity, ArrowLeft,
  RefreshCw, Loader2, CheckCircle2, Play,
} from '@/lib/icons'

interface Pipeline {
  id: string
  appName: string
  repoUrl: string
  framework: string
  containerApp: string
  status: string
  createdBy: string | null
  createdAt: string
  updatedAt: string
  githubOrg: string | null
  githubRepo: string | null
  githubBranch: string | null
  webhookId: number | null
  lastDeployedAt: string | null
  deploymentUrl: string | null
  version: number
  auditLog: { action: string; status: string; details: string }[] | null
}

interface WorkflowRun {
  id: number
  name: string
  status: string
  conclusion: string | null
  headBranch: string
  headSha: string
  runNumber: number
  htmlUrl: string
  createdAt: string
  updatedAt: string
}

interface AuditEntry {
  id: string
  action: string
  status: string
  resource: string
  resourceId: string | null
  createdAt: string
  metadata: Record<string, unknown> | null
}

const TIMELINE_STEPS = [
  { key: 'push', label: 'Push workflow to GitHub', icon: GitBranch },
  { key: 'webhook', label: 'Register webhook', icon: Activity },
  { key: 'federated_credential', label: 'Configure Azure OIDC', icon: Shield },
  { key: 'secret', label: 'Create GitHub secret', icon: Globe },
  { key: 'workflow_triggered', label: 'Workflow triggered', icon: Play },
  { key: 'deploying', label: 'Deploying to Azure', icon: Server },
  { key: 'deployed', label: 'Deployment complete', icon: CheckCircle2 },
]

const SORTED_AUDIT_ACTIONS = [
  'PIPELINE_GENERATED', 'PIPELINE_DEPLOY_START', 'PIPELINE_DEPLOY_COMPLETE',
  'PIPELINE_DEPLOY_FAILED', 'GITHUB_PUSH', 'GITHUB_WEBHOOK',
  'AZURE_FEDERATED_CREDENTIAL', 'GITHUB_SECRETS',
]

function getStepStatus(
  stepKey: string,
  pipeline: Pipeline,
  workflowRun: WorkflowRun | null
): 'pending' | 'running' | 'completed' | 'failed' | 'skipped' {
  const steps = (pipeline.auditLog || []) as { action: string; status: string }[]

  if (stepKey === 'push') {
    const s = steps.find(x => x.action === 'GITHUB_PUSH')
    if (!s) return pipeline.status !== 'GENERATED' ? 'completed' : 'pending'
    return s.status === 'SUCCESS' ? 'completed' : 'failed'
  }
  if (stepKey === 'webhook') {
    const s = steps.find(x => x.action === 'GITHUB_WEBHOOK')
    if (!s) return 'skipped'
    return s.status === 'SUCCESS' ? 'completed' : 'failed'
  }
  if (stepKey === 'federated_credential') {
    const s = steps.find(x => x.action === 'AZURE_FEDERATED_CREDENTIAL')
    if (!s) return 'skipped'
    return s.status === 'SUCCESS' ? 'completed' : 'failed'
  }
  if (stepKey === 'secret') {
    const s = steps.find(x => x.action === 'GITHUB_SECRETS')
    if (!s) return 'skipped'
    return s.status === 'SUCCESS' ? 'completed' : 'failed'
  }
  if (stepKey === 'workflow_triggered') {
    if (!workflowRun) return pipeline.status === 'PUSHED' || pipeline.status === 'GENERATED' ? 'pending' : 'skipped'
    return workflowRun.status !== 'completed' ? 'running' : 'completed'
  }
  if (stepKey === 'deploying') {
    if (!workflowRun) return pipeline.status === 'PUSHED' || pipeline.status === 'GENERATED' ? 'pending' : 'skipped'
    if (workflowRun.status === 'queued' || workflowRun.status === 'in_progress') return 'running'
    return workflowRun.conclusion === 'success' ? 'completed' : (workflowRun.conclusion ? 'failed' : 'running')
  }
  if (stepKey === 'deployed') {
    if (pipeline.status === 'DEPLOYED') return 'completed'
    if (pipeline.status === 'FAILED') return 'failed'
    if (pipeline.status === 'PUSHED' || pipeline.status === 'GENERATED') return 'pending'
    return 'pending'
  }
  return 'pending'
}

function formatDate(d: string) {
  return new Date(d).toLocaleString()
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    GENERATED: { label: 'Generated', cls: 'badge-info' },
    PUSHED: { label: 'Pushed', cls: 'badge-warning' },
    DEPLOYED: { label: 'Deployed', cls: 'badge-success' },
    FAILED: { label: 'Failed', cls: 'badge-danger' },
  }
  const m = map[status]
  return <span className={`badge ${m?.cls || 'badge-info'}`}>{m?.label || status}</span>
}

export default function PipelineDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/pipelines/${id}`)
      if (!res.ok) { setError('Pipeline not found'); return }
      const data = await res.json()
      setPipeline(data.pipeline)
      setWorkflowRuns(data.workflowRuns || [])
      setAuditLogs(data.auditLogs || [])
    } catch { setError('Failed to load pipeline') }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const latestRun = workflowRuns[0] || null
  const statusBadge = pipeline ? getStatusBadge(pipeline.status) : null

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Loader2 size={24} className="animate-spin" style={{ opacity: 0.4 }} />
      </div>
    )
  }

  if (error || !pipeline) {
    return (
      <div className="animate-fadein">
        <div className="page-header">
          <Link href="/dashboard/pipelines" className="btn btn-ghost btn-sm">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>{error || 'Pipeline not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fadein">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/dashboard/pipelines" className="btn btn-ghost btn-sm" style={{ padding: '0.35rem' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 className="page-title" style={{ fontSize: '1.25rem' }}>{pipeline.appName}</h1>
              {statusBadge}
              {pipeline.version > 1 && (
                <span className="badge badge-purple">v{pipeline.version}</span>
              )}
            </div>
            <p className="page-subtitle" style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>
              <a href={pipeline.repoUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-purple-light)', textDecoration: 'none' }}>
                {pipeline.githubOrg}/{pipeline.githubRepo} <ExternalLink size={11} />
              </a>
              {pipeline.githubBranch && <> · {pipeline.githubBranch}</>}
              {pipeline.framework && <> · <span style={{ textTransform: 'capitalize' }}>{pipeline.framework}</span></>}
            </p>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.25rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Deployment Timeline */}
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Activity size={15} style={{ color: 'var(--brand-purple-light)' }} /> Deployment Timeline
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {TIMELINE_STEPS.map((step) => {
                const status = getStepStatus(step.key, pipeline, latestRun)
                const Icon = step.icon
                return (
                  <div key={step.key} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.55rem 0.65rem', borderRadius: 8,
                    opacity: status === 'pending' ? 0.4 : 1,
                    background: status === 'running' ? 'rgba(59,130,246,0.06)' : 'transparent',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: status === 'completed' ? 'rgba(16,185,129,0.12)' :
                        status === 'failed' ? 'rgba(239,68,68,0.12)' :
                        status === 'running' ? 'rgba(59,130,246,0.12)' :
                        'var(--bg-secondary)',
                    }}>
                      {status === 'completed' ? <CheckCircle size={13} style={{ color: 'var(--success)' }} /> :
                       status === 'failed' ? <XCircle size={13} style={{ color: 'var(--danger)' }} /> :
                       status === 'running' ? <Loader2 size={13} style={{ color: '#3b82f6' }} className="animate-spin" /> :
                       <Icon size={13} style={{ color: 'var(--text-muted)' }} />}
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: status === 'running' ? 600 : 400 }}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* GitHub Actions Workflow Runs */}
          {workflowRuns.length > 0 && (
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Play size={15} style={{ color: 'var(--brand-purple-light)' }} /> Workflow Runs
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {workflowRuns.map((run) => (
                  <div key={run.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.6rem 0.75rem', borderRadius: 8,
                    background: 'var(--bg-secondary)', fontSize: '0.82rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: run.conclusion === 'success' ? 'var(--success)' :
                          run.conclusion === 'failure' ? 'var(--danger)' :
                          run.status === 'in_progress' ? '#3b82f6' :
                          'var(--text-muted)',
                      }} />
                      <span style={{ fontWeight: 500 }}>#{run.runNumber}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {run.status === 'completed' ? (run.conclusion || 'completed') : run.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{timeAgo(run.updatedAt)}</span>
                      <a href={run.htmlUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-purple-light)' }}>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Logs */}
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Activity size={15} style={{ color: 'var(--brand-purple-light)' }} /> Activity Logs
            </h2>
            {auditLogs.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '1rem 0', textAlign: 'center' }}>
                No activity logs yet
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {auditLogs.map((log) => (
                  <div key={log.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                    padding: '0.55rem 0.65rem', borderRadius: 8,
                    background: 'var(--bg-secondary)', fontSize: '0.8rem',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: log.status === 'SUCCESS' ? 'rgba(16,185,129,0.12)' :
                        log.status === 'FAILURE' ? 'rgba(239,68,68,0.12)' :
                        'rgba(59,130,246,0.12)',
                    }}>
                      {log.status === 'SUCCESS' ? <CheckCircle size={11} style={{ color: 'var(--success)' }} /> :
                       log.status === 'FAILURE' ? <XCircle size={11} style={{ color: 'var(--danger)' }} /> :
                       <Clock size={11} style={{ color: '#3b82f6' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500 }}>{log.action}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginTop: 1 }}>
                        {timeAgo(log.createdAt)}
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <span> · {JSON.stringify(log.metadata).slice(0, 80)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Pipeline Info */}
          <div className="card" style={{ padding: '1rem 1.15rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.85rem' }}>Pipeline Info</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--bg-border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                <span>{statusBadge}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--bg-border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Container App</span>
                <span style={{ fontWeight: 500 }}>{pipeline.containerApp}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--bg-border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Framework</span>
                <span style={{ textTransform: 'capitalize' }}>{pipeline.framework}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--bg-border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Version</span>
                <span>v{pipeline.version}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Created</span>
                <span>{formatDate(pipeline.createdAt)}</span>
              </div>
            </div>

            {pipeline.deploymentUrl && (
              <a
                href={pipeline.deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary w-full"
                style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', fontSize: '0.82rem' }}
              >
                <Server size={14} /> Open App <ExternalLink size={12} />
              </a>
            )}
          </div>

          {/* Quick Links */}
          <div className="card" style={{ padding: '1rem 1.15rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.75rem' }}>Quick Links</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
              <a href={pipeline.repoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--brand-purple-light)', textDecoration: 'none', padding: '0.4rem 0' }}>
                <GitBranch size={14} /> Repository <ExternalLink size={11} style={{ marginLeft: 'auto' }} />
              </a>
              {pipeline.githubOrg && pipeline.githubRepo && (
                <a href={`https://github.com/${pipeline.githubOrg}/${pipeline.githubRepo}/actions`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--brand-purple-light)', textDecoration: 'none', padding: '0.4rem 0' }}>
                  <Play size={14} /> Actions <ExternalLink size={11} style={{ marginLeft: 'auto' }} />
                </a>
              )}
              {pipeline.githubOrg && pipeline.githubRepo && pipeline.githubBranch && (
                <a href={`https://github.com/${pipeline.githubOrg}/${pipeline.githubRepo}/tree/${pipeline.githubBranch}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--brand-purple-light)', textDecoration: 'none', padding: '0.4rem 0' }}>
                  <FileText size={14} /> Workflow File <ExternalLink size={11} style={{ marginLeft: 'auto' }} />
                </a>
              )}
              <a href="/dashboard/audit-logs" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--brand-purple-light)', textDecoration: 'none', padding: '0.4rem 0' }}>
                <Activity size={14} /> All Activity Logs <ArrowLeft size={11} style={{ marginLeft: 'auto', transform: 'rotate(180deg)' }} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
