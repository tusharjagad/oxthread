import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { UserRole } from '@prisma/client'
import { enableUser, disableUser, deleteUser, rotatePassword, generatePassword } from '@/lib/postgres/provisioning'
import { hashPassword } from '@/lib/auth-utils'
import { errorResponse, ErrorCodes } from '@/lib/errors'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const body = await request.json()
    const { role, isActive, expiry, accessProfile } = body

    const pgUser = await prisma.postgresUser.findUnique({
      where: { id },
      include: { serverRef: true },
    })

    if (!pgUser) {
      return NextResponse.json({ error: 'User not found', code: ErrorCodes.NOT_FOUND }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (isActive !== undefined && pgUser.serverRef) {
      if (isActive) {
        await enableUser(pgUser.serverRef.secretRef, pgUser.username)
      } else {
        await disableUser(pgUser.serverRef.secretRef, pgUser.username)
      }
      updateData.isActive = isActive
    }

    if (role !== undefined) updateData.role = role
    if (expiry !== undefined) updateData.expiry = expiry ? new Date(expiry) : null
    if (accessProfile !== undefined) updateData.accessProfile = accessProfile

    const updated = await prisma.postgresUser.update({
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
      metadata: { changes: Object.keys(updateData), username: pgUser.username },
    })

    return NextResponse.json({ pgUser: updated })
  } catch (error) {
    const err = errorResponse(error)
    return NextResponse.json({ error: err.error, code: err.code }, { status: err.status })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  try {
    const { id } = await params

    const pgUser = await prisma.postgresUser.findUnique({
      where: { id },
      include: { serverRef: true },
    })

    if (!pgUser) {
      return NextResponse.json({ error: 'User not found', code: ErrorCodes.NOT_FOUND }, { status: 404 })
    }

    if (pgUser.serverRef) {
      await deleteUser(
        pgUser.serverRef.secretRef,
        pgUser.username,
        pgUser.databaseName ? [pgUser.databaseName] : undefined
      )
    }

    await prisma.postgresUser.delete({ where: { id } })

    await createAuditLog({
      userId: auth.userId,
      action: 'POSTGRES_USER_DELETED',
      resource: 'postgres_users',
      resourceId: id,
      ipAddress: getIpFromRequest(request),
      status: 'SUCCESS',
      metadata: { username: pgUser.username, server: pgUser.server, database: pgUser.databaseName },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const err = errorResponse(error)
    return NextResponse.json({ error: err.error, code: err.code }, { status: err.status })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const body = await request.json()
    const subAction = body.action

    if (subAction === 'rotate-password') {
      const pgUser = await prisma.postgresUser.findUnique({
        where: { id },
        include: { serverRef: true },
      })

      if (!pgUser) {
        return NextResponse.json({ error: 'User not found', code: ErrorCodes.NOT_FOUND }, { status: 404 })
      }

      if (!pgUser.serverRef) {
        return NextResponse.json({ error: 'Server reference not found', code: ErrorCodes.NOT_FOUND }, { status: 400 })
      }

      const newPassword = generatePassword()

      await rotatePassword(pgUser.serverRef.secretRef, pgUser.username, newPassword)

      const passwordHash = await hashPassword(newPassword)
      await prisma.postgresUser.update({
        where: { id },
        data: { passwordHash },
      })

      await createAuditLog({
        userId: auth.userId,
        action: 'POSTGRES_PASSWORD_ROTATED',
        resource: 'postgres_users',
        resourceId: id,
        ipAddress: getIpFromRequest(request),
        status: 'SUCCESS',
        metadata: { username: pgUser.username, server: pgUser.server },
      })

      return NextResponse.json({ password: newPassword })
    }

    return NextResponse.json({ error: 'Unknown action', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 })
  } catch (error) {
    const err = errorResponse(error)
    return NextResponse.json({ error: err.error, code: err.code }, { status: err.status })
  }
}
