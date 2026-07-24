import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { requireRole } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { errorResponse } from '@/lib/errors'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const body = await request.json()

    if (body.action === 'dismiss') {
      await prisma.azureRecommendation.update({
        where: { id },
        data: { status: 'dismissed' },
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    const err = errorResponse(error)
    return NextResponse.json({ error: err.error }, { status: err.status })
  }
}
