import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, requireAuth } from '@/lib/rbac'
import { hashPassword } from '@/lib/auth-utils'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { UserRole } from '@prisma/client'

// GET /api/users/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, accessKey: true, role: true,
      isActive: true, isLocked: true, totpEnabled: true,
      expiry: true, lastLogin: true, createdAt: true,
      failedLogins: true, ipAllowlist: true,
    },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ user })
}

// PATCH /api/users/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await request.json()
  const { role, isActive, isLocked, expiry, ipAllowlist, password } = body

  const updateData: Record<string, unknown> = {}
  if (role !== undefined) updateData.role = role
  if (isActive !== undefined) updateData.isActive = isActive
  if (isLocked !== undefined) {
    updateData.isLocked = isLocked
    if (!isLocked) updateData.failedLogins = 0
  }
  if (expiry !== undefined) updateData.expiry = expiry ? new Date(expiry) : null
  if (ipAllowlist !== undefined) updateData.ipAllowlist = ipAllowlist
  if (password) updateData.passwordHash = await hashPassword(password)

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true, username: true, role: true, isActive: true,
      isLocked: true, expiry: true, updatedAt: true,
    },
  })

  await createAuditLog({
    userId: auth.userId,
    action: 'USER_UPDATED',
    resource: 'users',
    resourceId: id,
    ipAddress: getIpFromRequest(request),
    status: 'SUCCESS',
    metadata: { changes: Object.keys(updateData) },
  })

  return NextResponse.json({ user })
}

// DELETE /api/users/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireRole(request, UserRole.SUPER_ADMIN)
  if (!auth.ok) return auth.response

  const { id } = await params

  if (id === auth.userId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id } })

  await createAuditLog({
    userId: auth.userId,
    action: 'USER_DELETED',
    resource: 'users',
    resourceId: id,
    ipAddress: getIpFromRequest(request),
    status: 'SUCCESS',
  })

  return NextResponse.json({ success: true })
}
