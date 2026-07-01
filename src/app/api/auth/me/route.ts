import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/rbac'
import { hashPassword, verifyPassword, generateAccessKey } from '@/lib/auth-utils'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { errorResponse, ErrorCodes } from '@/lib/errors'

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if (!auth.ok) return auth.response

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true, username: true, accessKey: true, role: true,
      isActive: true, totpEnabled: true, expiry: true,
      lastLogin: true, createdAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found', code: ErrorCodes.NOT_FOUND }, { status: 404 })
  }

  return NextResponse.json({ user })
}

export async function PATCH(request: NextRequest) {
  const auth = requireAuth(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const { username, currentPassword, newPassword, regenerateKey } = body

    const user = await prisma.user.findUnique({ where: { id: auth.userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found', code: ErrorCodes.NOT_FOUND }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    const changes: string[] = []

    // Username change
    if (username !== undefined && username !== user.username) {
      const existing = await prisma.user.findUnique({ where: { username } })
      if (existing) {
        return NextResponse.json(
          { error: 'Username already taken', code: ErrorCodes.DB_DUPLICATE_ENTRY },
          { status: 409 }
        )
      }
      updateData.username = username
      changes.push('username')
    }

    // Password change — requires current password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to set a new password', code: ErrorCodes.VALIDATION_ERROR },
          { status: 400 }
        )
      }
      const valid = await verifyPassword(currentPassword, user.passwordHash)
      if (!valid) {
        return NextResponse.json(
          { error: 'Current password is incorrect', code: ErrorCodes.AUTH_INVALID_CREDENTIALS },
          { status: 403 }
        )
      }
      updateData.passwordHash = await hashPassword(newPassword)
      changes.push('password')
    }

    // Access key regeneration — requires current password for security
    if (regenerateKey) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to regenerate access key', code: ErrorCodes.VALIDATION_ERROR },
          { status: 400 }
        )
      }
      const valid = await verifyPassword(currentPassword, user.passwordHash)
      if (!valid) {
        return NextResponse.json(
          { error: 'Current password is incorrect', code: ErrorCodes.AUTH_INVALID_CREDENTIALS },
          { status: 403 }
        )
      }
      const newKey = generateAccessKey()
      updateData.accessKey = newKey
      changes.push('accessKey')
    }

    if (changes.length === 0) {
      return NextResponse.json(
        { error: 'No changes provided', code: ErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      )
    }

    const updated = await prisma.user.update({
      where: { id: auth.userId },
      data: updateData,
      select: {
        id: true, username: true, accessKey: true, role: true,
        isActive: true, totpEnabled: true, expiry: true,
        lastLogin: true, createdAt: true,
      },
    })

    await createAuditLog({
      userId: auth.userId,
      action: 'PROFILE_UPDATED',
      resource: 'users',
      resourceId: auth.userId,
      ipAddress: getIpFromRequest(request),
      status: 'SUCCESS',
      metadata: { changes },
    })

    return NextResponse.json({
      user: updated,
      newAccessKey: changes.includes('accessKey') ? updated.accessKey : undefined,
      message: changes.includes('password')
        ? 'Password changed successfully'
        : changes.includes('accessKey')
          ? 'Access key regenerated — save it now, it won\'t be shown again'
          : 'Profile updated',
    })
  } catch (error) {
    const err = errorResponse(error)
    return NextResponse.json({ error: err.error, code: err.code }, { status: err.status })
  }
}
