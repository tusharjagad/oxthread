'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, RefreshCw, Loader2, CheckCircle2, X, DollarSign, AlertTriangle, Activity, Clock, ChevronDown } from '@/lib/icons'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

const ArrowUp = () => <TrendingUp size={12} style={{ color: '#ef4444' }} />

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
  type: string
  severity: string
  title: string
  description: string | null
  resourceName: string | null
  metricValue: number | null
  threshold: number | null
  status: string
  detectedAt: string
  metadata: Record<string, unknown> | null
}

interface ResourceChangeItem {
  resourceName: string; resourceType: string; previousCost: number; currentCost: number; change: number; changePercent: number
}

interface IdleResourceItem {
  resourceName: string; resourceType: string; monthlyCost: number; lastMonthCost: number; costVariance: number; reason: string
}

interface AnalysisData {
  increases: ResourceChangeItem[]
  idleResources: IdleResourceItem[]
  summary: { totalResources: number; increases: number; idleCount: number; totalIdleCost: number }
}

const PIE_COLORS = ['#7c3aed', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']

const RECOMMENDATION_LABELS: Record<string, string> = {
  rightsize: 'Right-size resource',
  reserved_instance: 'Buy reserved instance',
  idle_resource: 'Remove idle resource',
  storage_tier: 'Optimize storage tier',
}

const SEVERITY_CONFIG: Record<string, { color: string; badge: string; label: string }> = {
  critical: { color: '#ef4444', badge: 'error', label: 'Critical' },
  high: { color: '#f59e0b', badge: 'warning', label: 'High' },
  medium: { color: '#3b82f6', badge: 'info', label: 'Medium' },
  low: { color: '#6b7280', badge: 'info', label: 'Low' },
}

function NumberFlow({ value, prefix = '$' }: { value: number; prefix?: string }) {
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
  return <>{prefix}{display.toFixed(2)}</>
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
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'recommendations'>('overview')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cRes, bRes, rRes] = await Promise.all([
        fetch('/api/azure/costs'),
        fetch('/api/azure/costs/breakdown'),
        fetch('/api/azure/recommendations'),
      ])
      if (cRes.ok) setCostData(await cRes.json())
      if (bRes.ok) { const d = await bRes.json(); setBreakdown(d.breakdown || []) }
      if (rRes.ok) { const d = await rRes.json(); setRecommendations(d.recommendations || []) }

      const [aRes, anRes] = await Promise.all([
        fetch('/api/azure/alerts?status=open'),
        fetch('/api/azure/costs/analysis'),
      ])
      if (aRes.ok) { const d = await aRes.json(); setAlerts(d.alerts || []) }
      if (anRes.ok) { const d = await anRes.json(); setAnalysis(d) }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const dismiss = async (id: string) => {
    setDismissingId(id)
    await fetch(`/api/azure/recommendations/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss' }),
    })
    setRecommendations(prev => prev.filter(r => r.id !== id))
    setDismissingId(null)
  }

  const alertAction = async (id: string, action: string) => {
    setAlertActionId(id)
    await fetch(`/api/azure/alerts/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setAlerts(prev => prev.filter(a => a.id !== id))
    setAlertActionId(null)
  }

  const totalSavings = recommendations.reduce((sum, r) => sum + r.impact, 0)
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length
  const hasActiveAlerts = alerts.length > 0

  const statCards = costData ? [
    { label: 'Current Month', value: costData.currentMonth, color: '#7c3aed', icon: DollarSign },
    { label: 'Previous Month', value: costData.previousMonth, color: '#3b82f6', icon: Clock },
    { label: 'Forecast', value: costData.forecast ?? costData.currentMonth, color: '#06b6d4', icon: TrendingUp },
    { label: 'Potential Savings', value: totalSavings, color: '#10b981', icon: CheckCircle2 },
  ] : []

  return (
    <div className="animate-fadein">

      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Cost Management</h1>
          <p className="page-subtitle">Azure spending analytics & optimization</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { window.location.reload() }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Alerts Banner ── */}
      {hasActiveAlerts && (
        <div style={{
          marginBottom: '1rem', padding: '0.65rem 1rem', borderRadius: 10,
          background: criticalAlerts > 0 ? 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))' : 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))',
          border: `1px solid ${criticalAlerts > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', animation: 'fadeSlideUp 0.5s ease-out 0.05s both',
        }} onClick={() => setActiveTab('alerts')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Activity size={16} style={{ color: criticalAlerts > 0 ? '#ef4444' : '#f59e0b' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {alerts.length} active alert{alerts.length > 1 ? 's' : ''}
              {criticalAlerts > 0 && ` (${criticalAlerts} critical)`}
            </span>
          </div>
          <ChevronDown size={14} style={{ opacity: 0.5 }} />
        </div>
      )}

      {/* ── Stats Grid ── */}
      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        {statCards.map((c, i) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="stat-card"
              style={{ animation: `fadeSlideUp 0.5s ease-out ${i * 0.08}s both`, '--accent-color': c.color } as React.CSSProperties}>
              <div className="stat-card-icon" style={{ background: `${c.color}18` }}>
                <span style={{ color: c.color }}><Icon size={18} /></span>
              </div>
              <div className="stat-card-value" style={{ color: c.color }}>
                {loading ? <span style={{ fontSize: '1.5rem' }}>…</span> : <NumberFlow value={c.value} />}
              </div>
              <div className="stat-card-label">{c.label}</div>
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

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--bg-border)', paddingBottom: 0 }}>
        {[
          { key: 'overview', label: 'Overview', icon: DollarSign },
          { key: 'alerts', label: `Alerts${alerts.length > 0 ? ` (${alerts.length})` : ''}`, icon: Activity },
          { key: 'recommendations', label: 'Recommendations', icon: CheckCircle2 },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem',
                fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer',
                border: 'none', borderBottom: isActive ? '2px solid var(--accent, #7c3aed)' : '2px solid transparent',
                background: 'transparent', color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                marginBottom: '-1px', transition: 'all 0.15s',
              }}>
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <>
          {/* Charts Grid */}
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
                <div style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
                  <DollarSign size={28} style={{ opacity: 0.12, marginBottom: '0.75rem' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cost data loading</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', opacity: 0.6, marginTop: '0.25rem' }}>
                    Azure Cost Management API queries are sequential to avoid rate limits. Data will appear after processing.
                  </p>
                </div>
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
                <div style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
                  <DollarSign size={28} style={{ opacity: 0.12, marginBottom: '0.75rem' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cost breakdown loading</p>
                </div>
              )}
            </div>
          </div>

          {/* Resource Analysis Section */}
          {analysis && (analysis.increases.length > 0 || analysis.idleResources.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              {analysis.increases.length > 0 && (
                <div className="card" style={{ borderLeft: '3px solid #ef4444' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Cost Hikes</h2>
                    <span className="badge badge-error">{analysis.increases.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {analysis.increases.slice(0, 5).map((r) => (
                      <div key={r.resourceName} style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        padding: '0.45rem 0.6rem', borderRadius: 6,
                        background: 'var(--bg-elevated)', fontSize: '0.8rem',
                      }}>
                        <ArrowUp />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: '0.8rem' }}>{r.resourceName}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{r.resourceType}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 600, color: '#ef4444', fontSize: '0.8rem' }}>+{r.changePercent.toFixed(0)}%</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>${r.previousCost.toFixed(0)}→${r.currentCost.toFixed(0)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {analysis.idleResources.length > 0 && (
                <div className="card" style={{ borderLeft: '3px solid #f59e0b' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Idle Resources</h2>
                    <span className="badge badge-warning">${analysis.summary.totalIdleCost.toFixed(0)}/mo</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {analysis.idleResources.slice(0, 5).map((r) => (
                      <div key={r.resourceName} style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        padding: '0.45rem 0.6rem', borderRadius: 6,
                        background: 'var(--bg-elevated)', fontSize: '0.8rem',
                      }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                          background: 'rgba(245,158,11,0.12)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', color: '#f59e0b',
                        }}>
                          <AlertTriangle size={11} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: '0.8rem' }}>{r.resourceName}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{r.resourceType}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.8rem' }}>${r.monthlyCost.toFixed(2)}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{r.costVariance.toFixed(0)}% variance</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Alerts Tab ── */}
      {activeTab === 'alerts' && (
        <div className="card">
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
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem' }}>
              <CheckCircle2 size={32} style={{ opacity: 0.15, marginBottom: '0.75rem', color: '#10b981' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No active alerts. Everything looks good.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {(showAllAlerts ? alerts : alerts.slice(0, 5)).map((alert) => {
                const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low
                const isExpanded = expandedAlert === alert.id
                return (
                  <div key={alert.id}>
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                      padding: '0.55rem 0.7rem', borderRadius: 8, cursor: 'pointer',
                      background: isExpanded ? `${sev.color}06` : 'var(--bg-elevated)',
                      border: `1px solid ${isExpanded ? `${sev.color}18` : 'transparent'}`,
                      transition: 'all 0.15s',
                    }} onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                        background: `${sev.color}14`, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: sev.color,
                      }}>
                        <Activity size={13} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.1rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{alert.title}</span>
                          <span className={`badge badge-${sev.badge}`}
                            style={{ fontSize: '0.55rem', textTransform: 'uppercase', padding: '1px 5px' }}>
                            {sev.label}
                          </span>
                        </div>
                        <div style={{
                          color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.4,
                          display: '-webkit-box', WebkitLineClamp: isExpanded ? 'unset' : 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {alert.description}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, marginTop: '0.15rem' }}
                        onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.65rem', padding: '2px 6px', height: 'auto' }}
                          onClick={() => alertAction(alert.id, 'acknowledge')} disabled={alertActionId === alert.id}>
                          Ack
                        </button>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.65rem', padding: '2px 6px', height: 'auto' }}
                          onClick={() => alertAction(alert.id, 'dismiss')} disabled={alertActionId === alert.id}>
                          Dismiss
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{
                        margin: '0.3rem 0 0.3rem 2.4rem', padding: '0.75rem 0.85rem',
                        borderRadius: 8, background: 'var(--bg-elevated)',
                        fontSize: '0.78rem',
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginBottom: '0.15rem' }}>DETECTED AT</span>
                            <span style={{ fontWeight: 500, fontSize: '0.8rem' }}>{new Date(alert.detectedAt).toLocaleString()}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginBottom: '0.15rem' }}>RESOURCE</span>
                            <span style={{ fontWeight: 500, fontSize: '0.8rem', fontFamily: 'var(--font-mono, monospace)' }}>
                              {alert.resourceName || 'N/A'}
                            </span>
                          </div>
                          {alert.threshold !== null && (
                            <>
                              <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginBottom: '0.15rem' }}>PREVIOUS VALUE</span>
                                <span style={{ fontWeight: 500, fontSize: '0.8rem' }}>${alert.threshold.toFixed(2)}</span>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginBottom: '0.15rem' }}>CURRENT VALUE</span>
                                <span style={{ fontWeight: 600, fontSize: '0.8rem', color: sev.color }}>
                                  ${(alert.metricValue ?? 0).toFixed(2)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Visual comparison bar */}
                        {alert.threshold !== null && alert.threshold > 0 && alert.metricValue !== null && (
                          <div style={{ marginTop: '0.75rem' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.35rem' }}>COST COMPARISON</div>
                            <div style={{
                              height: 28, borderRadius: 6, overflow: 'hidden',
                              background: 'var(--bg-card)', display: 'flex', position: 'relative',
                            }}>
                              <div style={{
                                height: '100%', borderRadius: 6,
                                background: `linear-gradient(90deg, ${sev.color}44, ${sev.color}88)`,
                                transition: 'width 0.6s ease-out',
                                width: `${Math.min((alert.metricValue / (alert.metricValue * 1.5)) * 100, 100)}%`,
                                display: 'flex', alignItems: 'center', paddingLeft: '0.5rem',
                              }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#fff' }}>
                                  ${alert.metricValue.toFixed(2)} current
                                </span>
                              </div>
                              <div style={{
                                position: 'absolute', top: 0, left: `${Math.min((alert.threshold / (alert.metricValue * 1.5)) * 100, 90)}%`,
                                width: '2px', height: '100%', background: 'var(--text-primary)',
                              }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                              <span>$0</span>
                              <span style={{ fontWeight: 500 }}>Previous: ${alert.threshold.toFixed(2)}</span>
                              <span>${(alert.metricValue * 1.5).toFixed(0)}</span>
                            </div>
                          </div>
                        )}

                        <div style={{ marginTop: '0.6rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {alert.description}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Recommendations Tab ── */}
      {activeTab === 'recommendations' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>Cost Optimization Recommendations</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={async () => {
                const r = await fetch('/api/azure/recommendations?refresh=true')
                if (r.ok) { const d = await r.json(); setRecommendations(d.recommendations || []) }
              }}>
                <RefreshCw size={12} /> Refresh
              </button>
              {recommendations.length > 0 && (
                <span className="badge badge-warning">{recommendations.length}</span>
              )}
            </div>
          </div>
          {loading ? (
            <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={20} className="animate-spin" style={{ opacity: 0.4 }} />
            </div>
          ) : recommendations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem' }}>
              <CheckCircle2 size={32} style={{ opacity: 0.15, marginBottom: '0.75rem', color: '#10b981' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recommendations. Your Azure setup appears optimized.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {recommendations.filter(r => r.impact > 0 || !r.resourceName.includes('Subscription-level')).slice(0, 20).map((rec) => {
                const label = RECOMMENDATION_LABELS[rec.recommendationType] || rec.recommendationType.replace(/_/g, ' ').replace(/-/g, ' ')
                return (
                  <div key={rec.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.6rem 0.75rem', borderRadius: 8,
                    background: 'var(--bg-elevated)',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: 'rgba(16,185,129,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#10b981',
                    }}>
                      <CheckCircle2 size={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 500, lineHeight: 1.3 }}>
                        {label}
                        <span style={{ color: 'var(--text-muted)' }}> on </span>
                        <span className="font-mono" style={{ fontSize: '0.78rem' }}>{rec.resourceName}</span>
                      </div>
                      {rec.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {rec.description.slice(0, 100)}{rec.description.length > 100 ? '…' : ''}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981' }}>${rec.impact.toFixed(0)}/mo</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>potential</div>
                      </div>
                      <button className="btn btn-icon btn-ghost" title="Dismiss"
                        onClick={() => dismiss(rec.id)} disabled={dismissingId === rec.id} style={{ opacity: 0.4 }}>
                        {dismissingId === rec.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

    </div>
  )
}