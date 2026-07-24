import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { requireRole } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  try {
    const status = request.nextUrl.searchParams.get('status') || undefined
    const type = request.nextUrl.searchParams.get('type') || undefined

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (type) where.type = type

    const alerts = await prisma.aiAlert.findMany({
      where: where as never,
      orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }],
      take: 50,
    })

    const counts = await prisma.aiAlert.groupBy({
      by: ['status'],
      _count: true,
    })

    return NextResponse.json({
      alerts: alerts.map((a) => ({
        ...a,
        detectedAt: a.detectedAt.toISOString(),
      })),
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
    })
  } catch {
    return NextResponse.json({ alerts: [], counts: {} })
  }
}