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
    const action = body.action as string

    const validActions = ['acknowledge', 'resolve', 'dismiss']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use acknowledge, resolve, or dismiss.' }, { status: 400 })
    }

    const statusMap: Record<string, string> = {
      acknowledge: 'acknowledged',
      resolve: 'resolved',
      dismiss: 'dismissed',
    }

    await prisma.aiAlert.update({
      where: { id },
      data: {
        status: statusMap[action],
        ...(action === 'resolve' ? { resolvedAt: new Date() } : {}),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const err = errorResponse(error)
    return NextResponse.json({ error: err.error }, { status: err.status })
  }
}