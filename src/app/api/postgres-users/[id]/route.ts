import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { UserRole } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await request.json()
  const { role, isActive, expiry } = body

  const updateData: Record<string, unknown> = {}
  if (role !== undefined) updateData.role = role
  if (isActive !== undefined) updateData.isActive = isActive
  if (expiry !== undefined) updateData.expiry = expiry ? new Date(expiry) : null

  const pgUser = await prisma.postgresUser.update({
    where: { id },
    data: updateData,
  })

  await createAuditLog({
    userId: auth.userId,
    action: 'POSTGRES_USER_UPDATED',
    resource: 'postgres_users',
    resourceId: id,
    ipAddress: getIpFromRequest(request),
    status: 'SUCCESS',
    metadata: { changes: Object.keys(updateData) },
  })

  return NextResponse.json({ pgUser })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  const { id } = await params

  await prisma.postgresUser.delete({ where: { id } })

  await createAuditLog({
    userId: auth.userId,
    action: 'POSTGRES_USER_DELETED',
    resource: 'postgres_users',
    resourceId: id,
    ipAddress: getIpFromRequest(request),
    status: 'SUCCESS',
  })

  return NextResponse.json({ success: true })
}
