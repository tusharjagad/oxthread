import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { UserRole } from '@prisma/client'
import { createPostgresUser, generatePassword } from '@/lib/postgres/provisioning'
import { hashPassword } from '@/lib/auth-utils'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const body = await request.json()
    const { action } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action must be "approve" or "reject"' }, { status: 400 })
    }

    const accessRequest = await prisma.accessRequest.findUnique({
      where: { id },
      include: { server: true },
    })

    if (!accessRequest) {
      return NextResponse.json({ error: 'Access request not found' }, { status: 404 })
    }

    if (accessRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Request is already ${accessRequest.status.toLowerCase()}` },
        { status: 409 }
      )
    }

    if (action === 'reject') {
      await prisma.accessRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approvedBy: auth.userId,
          approvedAt: new Date(),
        },
      })

      await createAuditLog({
        userId: auth.userId,
        action: 'ACCESS_REQUEST_REJECTED',
        resource: 'access_requests',
        resourceId: id,
        ipAddress: getIpFromRequest(request),
        status: 'SUCCESS',
        metadata: { username: accessRequest.username, server: accessRequest.server.name },
      })

      return NextResponse.json({ request: { ...accessRequest, status: 'REJECTED' } })
    }

    if (action === 'approve') {
      if (accessRequest.accessProfile === 'APP_ADMIN') {
        return NextResponse.json(
          { error: 'APP_ADMIN profile requires separate super admin provisioning' },
          { status: 403 }
        )
      }

      if (!accessRequest.server) {
        return NextResponse.json({ error: 'Server not found' }, { status: 404 })
      }

      const password = generatePassword()

      await createPostgresUser(
        {
          host: accessRequest.server.host,
          port: accessRequest.server.port,
          ssl: accessRequest.server.sslEnabled,
          secretRef: accessRequest.server.secretRef,
        },
        {
          username: accessRequest.username,
          password,
          databaseName: accessRequest.databaseName || '',
          accessProfile: accessRequest.accessProfile,
        }
      )

      const passwordHash = await hashPassword(password)

      const pgUser = await prisma.postgresUser.create({
        data: {
          username: accessRequest.username,
          server: accessRequest.server.name,
          databaseName: accessRequest.databaseName || '',
          role: 'READ_WRITE',
          accessProfile: accessRequest.accessProfile,
          isActive: true,
          expiry: accessRequest.expiresAt,
          passwordHash,
          createdBy: auth.userId,
          serverId: accessRequest.serverId,
          databaseId: accessRequest.databaseId,
        },
      })

      await prisma.accessRequest.update({
        where: { id },
        data: {
          status: 'PROVISIONED',
          approvedBy: auth.userId,
          approvedAt: new Date(),
        },
      })

      await createAuditLog({
        userId: auth.userId,
        action: 'ACCESS_REQUEST_APPROVED',
        resource: 'access_requests',
        resourceId: id,
        ipAddress: getIpFromRequest(request),
        status: 'SUCCESS',
        metadata: {
          username: accessRequest.username,
          server: accessRequest.server.name,
          databaseName: accessRequest.databaseName,
          accessProfile: accessRequest.accessProfile,
        },
      })

      return NextResponse.json({ request: { ...accessRequest, status: 'PROVISIONED' }, pgUser, password })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'User already exists on this server/database' }, { status: 409 })
    }
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, UserRole.SUPER_ADMIN)
  if (!auth.ok) return auth.response

  try {
    const { id } = await params

    const accessRequest = await prisma.accessRequest.findUnique({ where: { id } })
    if (!accessRequest) {
      return NextResponse.json({ error: 'Access request not found' }, { status: 404 })
    }

    if (accessRequest.status === 'PROVISIONED') {
      return NextResponse.json(
        { error: 'Cannot delete a provisioned request. Remove the user first.' },
        { status: 409 }
      )
    }

    await prisma.accessRequest.delete({ where: { id } })

    await createAuditLog({
      userId: auth.userId,
      action: 'ACCESS_REQUEST_DELETED',
      resource: 'access_requests',
      resourceId: id,
      ipAddress: getIpFromRequest(request),
      status: 'SUCCESS',
      metadata: { username: accessRequest.username, server: 'removed' },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
