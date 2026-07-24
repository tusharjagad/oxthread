import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { requireRole } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  try {
    const days = parseInt(request.nextUrl.searchParams.get('days') || '90', 10)

    const snapshots = await prisma.azureCostSnapshot.findMany({
      take: days,
      orderBy: { date: 'asc' },
      select: {
        date: true,
        cost: true,
        forecast: true,
        currency: true,
      },
    })

    return NextResponse.json({
      history: snapshots.map((s) => ({
        date: s.date.toISOString().split('T')[0],
        cost: s.cost,
        forecast: s.forecast,
      })),
    })
  } catch (error) {
    return NextResponse.json({ history: [] })
  }
}
