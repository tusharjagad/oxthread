import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { UserRole } from '@prisma/client'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  const { id } = await params

  await prisma.secret.delete({ where: { id } })

  await createAuditLog({
    userId: auth.userId,
    action: 'SECRET_DELETED',
    resource: 'secrets',
    resourceId: id,
    ipAddress: getIpFromRequest(request),
    status: 'SUCCESS',
  })

  return NextResponse.json({ success: true })
}
