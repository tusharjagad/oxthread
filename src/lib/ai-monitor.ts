import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

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
        type: 'cost_spike',
        severity: recent.cost > avg * 2 ? 'critical' : 'high',
        title: 'Daily cost spike detected',
        description: `Cost on ${recent.date.toISOString().split('T')[0]} is $${recent.cost.toFixed(2)} vs 14-day avg of $${avg.toFixed(2)} (${((recent.cost - avg) / avg * 100).toFixed(0)}% spike).`,
        metricValue: recent.cost,
        threshold: Math.round(threshold * 100) / 100,
        metadata: {
          averageCost: Math.round(avg * 100) / 100,
          dailyCosts: days.map((d) => ({ date: d.date.toISOString().split('T')[0], cost: d.cost })),
        },
      })
    }
  }

  const latestSnapshot = await prisma.azureCostSnapshot.findFirst({
    orderBy: { date: 'desc' },
    select: { id: true },
  })

  if (latestSnapshot) {
    const breakdowns = await prisma.azureCostBreakdown.findMany({
      where: { snapshotId: latestSnapshot.id },
      select: { resourceName: true, resourceType: true, cost: true, resourceId: true },
    })

    for (const b of breakdowns) {
      if (b.cost > 0 && b.cost < 1) {
        alerts.push({
          type: 'unused_resource',
          severity: 'low',
          title: 'Potential idle resource',
          description: `${b.resourceName} (${b.resourceType}) costs only $${b.cost.toFixed(2)} this month. Consider rightsizing or removing.`,
          resourceId: b.resourceId,
          resourceName: b.resourceName,
          metricValue: b.cost,
          threshold: 1,
        })
      }
    }

    const sorted = [...breakdowns].sort((a, b) => b.cost - a.cost)
    if (sorted.length > 0) {
      const topThreshold = sorted[0].cost * 0.3
      if (topThreshold > 50) {
        for (const b of breakdowns) {
          if (b.cost >= topThreshold) {
            const existingTitle = alerts.find(
              (a) => a.resourceId === b.resourceId && a.type === 'new_expensive_resource'
            )
            if (!existingTitle) {
              alerts.push({
                type: 'new_expensive_resource',
                severity: 'medium',
                title: 'High-cost resource detected',
                description: `${b.resourceName} (${b.resourceType}) costs $${b.cost.toFixed(2)} this month. Verify this cost is expected.`,
                resourceId: b.resourceId,
                resourceName: b.resourceName,
                metricValue: b.cost,
                threshold: Math.round(topThreshold * 100) / 100,
              })
            }
          }
        }
      }
    }
  }

  return { alerts }
}

export async function syncAiAlerts(): Promise<{ created: number }> {
  const { alerts } = await runCostAnalysis()

  let created = 0
  for (const a of alerts) {
    const existing = await prisma.aiAlert.findFirst({
      where: {
        type: a.type,
        resourceId: a.resourceId ?? null,
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