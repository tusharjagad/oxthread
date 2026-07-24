import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { requireRole } from '@/lib/rbac'
import { queryMonthlyCost } from '@/lib/azure-cost'
import { errorResponse } from '@/lib/errors'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  try {
    const costData = await queryMonthlyCost('ThisMonth')

    const byType: Record<string, { resources: number; cost: number }> = {}
    for (const r of costData.resources) {
      const type = r.resourceType || 'Other'
      if (!byType[type]) byType[type] = { resources: 0, cost: 0 }
      byType[type].resources++
      byType[type].cost += r.cost
    }

    const breakdown = Object.entries(byType)
      .map(([type, data]) => ({
        type,
        resources: data.resources,
        cost: Math.round(data.cost * 100) / 100,
        percentage: costData.totalCost > 0 ? Math.round((data.cost / costData.totalCost) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.cost - a.cost)

    return NextResponse.json({
      breakdown,
      total: costData.totalCost,
      currency: costData.currency,
    })
  } catch (error) {
    const err = errorResponse(error)
    return NextResponse.json({ error: err.error, code: err.code }, { status: err.status })
  }
}
