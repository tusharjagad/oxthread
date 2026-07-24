import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { requireRole } from '@/lib/rbac'
import { getResourceCostChanges, getIdleResources } from '@/lib/resource-analysis'
import { errorResponse } from '@/lib/errors'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  try {
    const [costChanges, idle] = await Promise.all([
      getResourceCostChanges(),
      getIdleResources(),
    ])

    return NextResponse.json({
      increases: costChanges.increases.slice(0, 30),
      decreases: costChanges.decreases.slice(0, 30),
      idleResources: idle.slice(0, 30),
      summary: {
        totalResources: costChanges.changes.length,
        increases: costChanges.increases.length,
        decreases: costChanges.decreases.length,
        idleCount: idle.length,
        totalIdleCost: Math.round(idle.reduce((s, r) => s + r.monthlyCost, 0) * 100) / 100,
      },
    })
  } catch (error) {
    const err = errorResponse(error)
    return NextResponse.json({ error: err.error, code: err.code }, { status: err.status })
  }
}