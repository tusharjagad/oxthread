import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { requireRole } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getAdvisorRecommendations } from '@/lib/azure-cost'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  try {
    const existing = await prisma.azureRecommendation.findMany({
      where: { status: { not: 'dismissed' } },
      orderBy: { impact: 'desc' },
      take: 50,
    })

    if (existing.length === 0) {
      const fresh = await getAdvisorRecommendations()
      if (fresh.length > 0) {
        const records = fresh.map((r) => ({
          resourceId: r.resourceId,
          resourceName: r.resourceName,
          recommendationType: r.recommendationType,
          impact: r.impact,
          currency: r.currency,
          description: r.description,
          action: r.action,
        }))
        await prisma.azureRecommendation.createMany({ data: records })
        const saved = await prisma.azureRecommendation.findMany({
          where: { status: { not: 'dismissed' } },
          orderBy: { impact: 'desc' },
          take: 50,
        })
        return NextResponse.json({ recommendations: saved })
      }
    }

    return NextResponse.json({ recommendations: existing })
  } catch {
    return NextResponse.json({ recommendations: [] })
  }
}
