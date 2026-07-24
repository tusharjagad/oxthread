import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { UserRole } from '@prisma/client'
import { getContainerAppCount } from '@/lib/azure-cost'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  const [
    totalUsers,
    activePipelines,
    totalSecrets,
    pendingAccessRequests,
    recentActivity,
    requestOverview,
    latestCost,
    azureResourceCount,
  ] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.pipeline.count(),
    prisma.secret.count(),
    prisma.accessRequest.count({ where: { status: 'PENDING' } }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { username: true } } },
    }),
    prisma.$queryRaw<{ status: string; count: bigint }[]>`
      SELECT status, COUNT(*) as count
      FROM access_requests
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY status
    `,
    prisma.azureCostSnapshot.findFirst({
      orderBy: { date: 'desc' },
      select: { cost: true, forecast: true, currency: true },
    }),
    getContainerAppCount().catch(() => 0),
  ])

  return NextResponse.json({
    stats: {
      totalUsers,
      activePipelines,
      azureResources: azureResourceCount,
      activeRequests: pendingAccessRequests,
      monthlyCost: latestCost?.cost ?? null,
      monthlyCostForecast: latestCost?.forecast ?? null,
      costCurrency: latestCost?.currency ?? 'USD',
    },
    recentActivity,
    requestOverview: requestOverview.map((r) => ({
      status: r.status,
      count: Number(r.count),
    })),
  })
}
