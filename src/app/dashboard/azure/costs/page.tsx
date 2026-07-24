'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, RefreshCw, Loader2, CheckCircle2, X, DollarSign, AlertTriangle, Activity } from '@/lib/icons'

const ArrowUp = () => <TrendingUp size={12} style={{ color: '#ef4444' }} />
const ArrowDown = () => <TrendingUp size={12} style={{ color: '#10b981', transform: 'scaleY(-1)' }} />
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

interface CostData {
  currentMonth: number
  previousMonth: number
  forecast: number | null
  change: number
  currency: string
  resources: Array<{ resourceName: string; resourceType: string; location: string | null; cost: number }>
}

interface BreakdownItem { type: string; resources: number; cost: number; percentage: number }

interface RecommendationsItem { id: string; resourceName: string; recommendationType: string; impact: number; currency: string; description: string | null; action: string | null; status: string }

interface AiAlertItem {
  id: string
  type: 'cost_spike' | 'unused_resource' | 'new_expensive_resource' | 'suspicious_activity' | 'daily_spike' | 'new_resource'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string | null
  resourceName: string | null
  metricValue: number | null
  threshold: number | null
  status: string
  detectedAt: string
}

interface ResourceChangeItem {
  resourceName: string
  resourceType: string
  previousCost: number
  currentCost: number
  change: number
  changePercent: number
}

interface IdleResourceItem {
  resourceName: string
  resourceType: string
  monthlyCost: number
  lastMonthCost: number
  costVariance: number
  reason: string
}

interface AnalysisData {
  increases: ResourceChangeItem[]
  idleResources: IdleResourceItem[]
  summary: { totalResources: number; increases: number; idleCount: number; totalIdleCost: number }
}

const PIE_COLORS = ['#7c3aed','#3b82f6','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#0ea5e9']

const RECOMMENDATION_LABELS: Record<string, string> = {
  rightsize: 'Right-size resource',
  reserved_instance: 'Buy reserved instance',
  idle_resource: 'Remove idle resource',
  storage_tier: 'Optimize storage tier',
}

const ALERT_ICONS: Record<string, typeof AlertTriangle> = {
  cost_spike: TrendingUp,
  unused_resource: AlertTriangle,
  new_expensive_resource: DollarSign,
  suspicious_activity: Activity,
  daily_spike: TrendingUp,
  new_resource: DollarSign,
}

const ALERT_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#6b7280',
}

function NumberFlow({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const target = value
    const duration = 600
    const start = performance.now()
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplay(target * ease)
      if (t < 1) requestAnimationFrame(tick)
      else setDisplay(target)
    }
    requestAnimationFrame(tick)
  }, [value])
  return <>${display.toFixed(2)}</>
}

export default function AzureCostManagementPage() {
  const [costData, setCostData] = useState<CostData | null>(null)
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([])
  const [recommendations, setRecommendations] = useState<RecommendationsItem[]>([])
  const [alerts, setAlerts] = useState<AiAlertItem[]>([])
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissingId, setDismissingId] = useState<string | null>(null)
  const [alertActionId, setAlertActionId] = useState<string | null>(null)
  const [showAllAlerts, setShowAllAlerts] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cRes, bRes, rRes, aRes, anRes] = await Promise.all([
        fetch('/api/azure/costs'),
        fetch('/api/azure/costs/breakdown'),
        fetch('/api/azure/recommendations'),
        fetch('/api/azure/alerts?status=open'),
        fetch('/api/azure/costs/analysis'),
      ])
      if (cRes.ok) setCostData(await cRes.json())
      if (bRes.ok) { const d = await bRes.json(); setBreakdown(d.breakdown || []) }
      if (rRes.ok) { const d = await rRes.json(); setRecommendations(d.recommendations || []) }
      if (aRes.ok) { const d = await aRes.json(); setAlerts(d.alerts || []) }
      if (anRes.ok) { const d = await anRes.json(); setAnalysis(d) }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const dismiss = async (id: string) => {
    setDismissingId(id)
    await fetch(`/api/azure/recommendations/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss' }),
    })
    setRecommendations(prev => prev.filter(r => r.id !== id))
    setDismissingId(null)
  }

  const alertAction = async (id: string, action: string) => {
    setAlertActionId(id)
    await fetch(`/api/azure/alerts/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setAlerts(prev => prev.filter(a => a.id !== id))
    setAlertActionId(null)
  }

  const totalSavings = recommendations.reduce((sum, r) => sum + r.impact, 0)

  const statCards = costData ? [
    { label: 'Current Month', value: costData.currentMonth, color: '#7c3aed', icon: DollarSign },
    { label: 'Previous Month', value: costData.previousMonth, color: '#3b82f6', icon: DollarSign },
    { label: 'Forecast', value: costData.forecast ?? costData.currentMonth, color: '#06b6d4', icon: TrendingUp },
    { label: 'Potential Savings', value: totalSavings, color: '#10b981', icon: CheckCircle2 },
  ] : []

  return (
    <div className="animate-fadein">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cost Management</h1>
          <p className="page-subtitle">Azure spending and cost optimization</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        {statCards.map((c, i) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="stat-card"
              style={{
                animation: `fadeSlideUp 0.5s ease-out ${i * 0.08}s both`,
              }}
            >
              <div className="stat-card-icon" style={{ background: `${c.color}22` }}>
                <span style={{ color: c.color }}><Icon size={18} /></span>
              </div>
              <div className="stat-card-value" style={{ color: c.color }}>
                {loading ? <span style={{ fontSize: '1.5rem' }}>…</span> : <NumberFlow value={c.value} />}
              </div>
              <div className="stat-card-label" style={{ color: 'var(--text-secondary)' }}>{c.label}</div>
              {c.label === 'Current Month' && costData?.change !== undefined && (
                <div className="stat-card-delta" style={{ color: costData.change > 0 ? '#ef4444' : '#10b981' }}>
                  <TrendingUp size={11} style={{ transform: costData.change > 0 ? 'rotate(0)' : 'scaleY(-1)' }} />
                  {Math.abs(costData.change).toFixed(1)}% vs last month
                </div>
              )}
            </div>
          )
        })}
      </div>

      {alerts.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem', animation: 'fadeSlideUp 0.5s ease-out 0.1s both' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={16} style={{ color: '#f59e0b' }} />
              AI Monitoring Alerts
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="badge badge-warning">{alerts.length} active</span>
              {alerts.length > 5 && (
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem' }}
                  onClick={() => setShowAllAlerts(!showAllAlerts)}>
                  {showAllAlerts ? 'Show less' : `Show all ${alerts.length}`}
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {(showAllAlerts ? alerts : alerts.slice(0, 5)).map((alert) => {
              const Icon = ALERT_ICONS[alert.type] || AlertTriangle
              const color = ALERT_COLORS[alert.severity] || '#6b7280'
              return (
                <div key={alert.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                  padding: '0.5rem 0.65rem', borderRadius: 8,
                  background: 'var(--bg-elevated)', fontSize: '0.82rem',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                    background: `${color}18`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color,
                  }}>
                    <Icon size={12} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.1rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{alert.title}</span>
                      <span className={`badge badge-${alert.severity === 'critical' ? 'error' : alert.severity === 'high' ? 'warning' : 'info'}`}
                        style={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.03em', padding: '1px 5px' }}>
                        {alert.severity}
                      </span>
                    </div>
                    {alert.description && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.4 }}>
                        {alert.description}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, marginTop: '0.15rem' }}>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.65rem', padding: '2px 6px', height: 'auto' }}
                      onClick={() => alertAction(alert.id, 'acknowledge')}
                      disabled={alertActionId === alert.id}>
                      Ack
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.65rem', padding: '2px 6px', height: 'auto' }}
                      onClick={() => alertAction(alert.id, 'dismiss')}
                      disabled={alertActionId === alert.id}>
                      Dismiss
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {analysis && analysis.increases.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem', animation: 'fadeSlideUp 0.5s ease-out 0.12s both', borderLeft: '3px solid #ef4444' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={16} style={{ color: '#ef4444' }} />
              Resource Cost Hikes
            </h2>
            <span className="badge badge-error">{analysis.increases.length} resources</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {analysis.increases.slice(0, 10).map((r) => (
              <div key={r.resourceName} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.5rem 0.75rem', borderRadius: 6,
                background: 'var(--bg-elevated)', fontSize: '0.82rem',
              }}>
                <ArrowUp />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{r.resourceName}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.resourceType}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 600, color: '#ef4444' }}>+{r.changePercent.toFixed(0)}%</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    ${r.previousCost.toFixed(0)} → ${r.currentCost.toFixed(0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis && analysis.idleResources.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem', animation: 'fadeSlideUp 0.5s ease-out 0.14s both', borderLeft: '3px solid #f59e0b' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
              Idle Resources — Billed but Underutilized
            </h2>
            <span className="badge badge-warning">{analysis.idleResources.length} resources — ${analysis.summary.totalIdleCost.toFixed(0)}/mo</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {analysis.idleResources.slice(0, 10).map((r) => (
              <div key={r.resourceName} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.5rem 0.75rem', borderRadius: 6,
                background: 'var(--bg-elevated)', fontSize: '0.82rem',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: 'rgba(245,158,11,0.12)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#f59e0b',
                }}>
                  <AlertTriangle size={13} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{r.resourceName}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {r.resourceType} — {r.reason}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 600, color: '#f59e0b' }}>${r.monthlyCost.toFixed(2)}/mo</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {r.costVariance.toFixed(1)}% variance
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ animation: 'fadeSlideUp 0.5s ease-out 0.15s both' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>Cost by Resource</h2>
          {loading ? (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={24} className="animate-spin" style={{ opacity: 0.4 }} />
            </div>
          ) : costData && costData.resources.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={costData.resources.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tickFormatter={(v: number) => `$${v}`} style={{ fontSize: '0.7rem', fill: 'var(--text-muted)' }} />
                <YAxis type="category" dataKey="resourceName" width={100} tick={{ fontSize: '0.7rem', fill: 'var(--text-muted)' }} />
                <ReTooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 8, fontSize: '0.8rem' }}
                  labelStyle={{ color: 'var(--text-muted)' }} />
                <Bar dataKey="cost" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>No cost data available. Check Azure credentials.</p>
          )}
        </div>

        <div className="card" style={{ animation: 'fadeSlideUp 0.5s ease-out 0.25s both' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>Cost by Type</h2>
          {loading ? (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={24} className="animate-spin" style={{ opacity: 0.4 }} />
            </div>
          ) : breakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={breakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                    dataKey="cost" nameKey="type" paddingAngle={2}>
                    {breakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 8, fontSize: '0.8rem' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem' }}>
                {breakdown.slice(0, 6).map((b, i) => (
                  <div key={b.type} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{b.type}</span>
                    <span style={{ fontWeight: 600 }}>{b.percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>No breakdown available</p>
          )}
        </div>
      </div>

      <div className="card" style={{ animation: 'fadeSlideUp 0.5s ease-out 0.35s both' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>Cost Optimization Recommendations</h2>
          {recommendations.length > 0 && (
            <span className="badge badge-warning">{recommendations.length} open</span>
          )}
        </div>
        {loading ? (
          <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={20} className="animate-spin" style={{ opacity: 0.4 }} />
          </div>
        ) : recommendations.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>
            No recommendations. Your Azure setup appears optimized.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recommendations.map((rec) => (
              <div key={rec.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem', borderRadius: 8,
                background: 'var(--bg-elevated)',
                transition: 'all 0.2s',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(16,185,129,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#10b981',
                }}>
                  <CheckCircle2 size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.3 }}>
                    {RECOMMENDATION_LABELS[rec.recommendationType] || rec.recommendationType.replace(/_/g, ' ')}
                    <span style={{ color: 'var(--text-muted)' }}> on </span>
                    <span className="font-mono" style={{ fontSize: '0.8rem' }}>{rec.resourceName}</span>
                  </div>
                  {rec.description && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {rec.description}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>${rec.impact.toFixed(0)}/mo</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>potential</div>
                  </div>
                  <button className="btn btn-icon btn-ghost" title="Dismiss"
                    onClick={() => dismiss(rec.id)}
                    disabled={dismissingId === rec.id}
                    style={{ opacity: 0.5 }}>
                    {dismissingId === rec.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
