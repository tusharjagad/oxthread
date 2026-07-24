import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { queryMonthlyCost } from '@/lib/azure-cost'
import { getResourceCostChanges, getIdleResources } from '@/lib/resource-analysis'

interface AlertCandidate {
  type: string
  severity: string
  title: string
  description?: string
  resourceId?: string
  resourceName?: string
  metricValue?: number
  threshold?: number
  metadata?: Record<string, unknown>
}

export async function runCostAnalysis(): Promise<{ alerts: AlertCandidate[] }> {
  const alerts: AlertCandidate[] = []

  // ── 1. Per-resource cost hikes (month-over-month) ──
  try {
    const { increases } = await getResourceCostChanges()
    for (const inc of increases) {
      if (inc.changePercent < 50) continue
      alerts.push({
        type: 'cost_spike',
        severity: inc.changePercent > 150 ? 'critical' : inc.changePercent > 80 ? 'high' : 'medium',
        title: `Cost hike: ${inc.resourceName}`,
        description: `${inc.resourceName} (${inc.resourceType}) cost jumped from $${inc.previousCost.toFixed(2)} to $${inc.currentCost.toFixed(2)} — a ${inc.changePercent.toFixed(0)}% increase.`,
        resourceName: inc.resourceName,
        metricValue: inc.currentCost,
        threshold: inc.previousCost,
        metadata: {
          changePercent: inc.changePercent,
          previousCost: inc.previousCost,
          resourceType: inc.resourceType,
        },
      })
    }
  } catch {}

  // ── 2. Idle-but-billed resources ──
  try {
    const idleResources = await getIdleResources()
    for (const r of idleResources) {
      alerts.push({
        type: 'unused_resource',
        severity: r.monthlyCost > 50 ? 'high' : r.monthlyCost > 20 ? 'medium' : 'low',
        title: `Idle resource: ${r.resourceName}`,
        description: `${r.resourceName} (${r.resourceType}) costs $${r.monthlyCost.toFixed(2)}/mo with only ${r.costVariance.toFixed(1)}% month-over-month variance — appears always-on but underutilized.`,
        resourceName: r.resourceName,
        metricValue: r.monthlyCost,
        threshold: r.lastMonthCost,
        metadata: {
          resourceType: r.resourceType,
          costVariance: r.costVariance,
          lastMonthCost: r.lastMonthCost,
          reason: r.reason,
        },
      })
    }
  } catch {}

  // ── 3. Overall daily cost spikes ──
  try {
    const snapshots = await prisma.azureCostSnapshot.findMany({
      orderBy: { date: 'asc' },
      take: 14,
      select: { date: true, cost: true },
    })

    if (snapshots.length >= 3) {
      const days = snapshots.map((s) => ({ date: s.date, cost: s.cost }))
      const recent = days[days.length - 1]
      const prior = days.slice(0, -1)
      const avg = prior.reduce((s, d) => s + d.cost, 0) / prior.length
      const stdDev = Math.sqrt(prior.reduce((s, d) => s + (d.cost - avg) ** 2, 0) / prior.length)

      const threshold = stdDev > 0 ? avg + 2 * stdDev : avg * 1.5
      if (recent.cost > threshold && recent.cost > avg * 1.3) {
        alerts.push({
          type: 'daily_spike',
          severity: recent.cost > avg * 2 ? 'critical' : 'high',
          title: 'Overall daily cost spike detected',
          description: `Total cost on ${recent.date.toISOString().split('T')[0]} hit $${recent.cost.toFixed(2)} vs 14-day avg of $${avg.toFixed(2)} (${((recent.cost - avg) / avg * 100).toFixed(0)}% spike).`,
          metricValue: recent.cost,
          threshold: Math.round(threshold * 100) / 100,
          metadata: {
            averageCost: Math.round(avg * 100) / 100,
            dailyCosts: days.map((d) => ({ date: d.date.toISOString().split('T')[0], cost: d.cost })),
          },
        })
      }
    }
  } catch {}

  // ── 4. New resources appearing this month ──
  try {
    const [current, previous] = await Promise.all([
      queryMonthlyCost('ThisMonth'),
      queryMonthlyCost('LastMonth'),
    ])
    const prevNames = new Set(previous.resources.map((r) => r.resourceName))
    for (const r of current.resources) {
      if (!prevNames.has(r.resourceName) && r.cost >= 10) {
        alerts.push({
          type: 'new_resource',
          severity: r.cost > 100 ? 'high' : 'medium',
          title: `New resource detected: ${r.resourceName}`,
          description: `${r.resourceName} (${r.resourceType}) appeared this month costing $${r.cost.toFixed(2)} so far. Verify this was intentionally provisioned.`,
          resourceName: r.resourceName,
          metricValue: r.cost,
          metadata: { resourceType: r.resourceType },
        })
      }
    }
  } catch {}

  return { alerts }
}

export async function syncAiAlerts(): Promise<{ created: number }> {
  const { alerts } = await runCostAnalysis()

  let created = 0
  for (const a of alerts) {
    const existing = await prisma.aiAlert.findFirst({
      where: {
        type: a.type,
        resourceName: a.resourceName ?? null,
        status: { in: ['open', 'acknowledged'] },
      },
    })
    if (!existing) {
      await prisma.aiAlert.create({
        data: {
          type: a.type,
          severity: a.severity,
          title: a.title,
          description: a.description,
          resourceId: a.resourceId,
          resourceName: a.resourceName,
          metricValue: a.metricValue,
          threshold: a.threshold,
          metadata: a.metadata as Prisma.InputJsonValue | undefined,
        },
      })
      created++
    }
  }

  return { created }
}