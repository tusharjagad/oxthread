import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { requireRole } from '@/lib/rbac'
import { queryMonthlyCost, getForecast } from '@/lib/azure-cost'
import { errorResponse } from '@/lib/errors'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  try {
    const currentMonth = await queryMonthlyCost('ThisMonth')
    const lastMonth = await queryMonthlyCost('LastMonth')
    const forecast = await getForecast()

    const currentTotal = currentMonth.totalCost
    const lastTotal = lastMonth.totalCost
    const change = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0

    return NextResponse.json({
      currentMonth: currentTotal,
      previousMonth: lastTotal,
      forecast,
      change: Math.round(change * 100) / 100,
      currency: currentMonth.currency,
      resources: currentMonth.resources.slice(0, 20),
    })
  } catch (error) {
    const err = errorResponse(error)
    return NextResponse.json({ error: err.error, code: err.code }, { status: err.status })
  }
}
