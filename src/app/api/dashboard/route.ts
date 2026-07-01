import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { UserRole } from '@prisma/client'

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
  ])

  const azureResources = 67 // placeholder until Azure SDK integration

  return NextResponse.json({
    stats: {
      totalUsers,
      activePipelines,
      azureResources,
      activeRequests: pendingAccessRequests,
    },
    recentActivity,
    requestOverview: requestOverview.map((r) => ({
      status: r.status,
      count: Number(r.count),
    })),
  })
}
