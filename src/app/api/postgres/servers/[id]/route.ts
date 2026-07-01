import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { UserRole } from '@prisma/client'
import { updateServerSchema } from '@/lib/validations/postgresql'
import { closePool } from '@/lib/postgres/pool'
import { resolveCredentials } from '@/lib/postgres/secrets'
import { errorResponse, ErrorCodes } from '@/lib/errors'

function notFound() {
  return NextResponse.json({ error: 'Server not found', code: ErrorCodes.NOT_FOUND }, { status: 404 })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  try {
    const { id } = await params

    const server = await prisma.postgresServer.findUnique({
      where: { id },
      include: {
        databases: { orderBy: { name: 'asc' } },
        _count: { select: { pgUsers: true } },
      },
    })

    if (!server) return notFound()

    return NextResponse.json({ server })
  } catch (error) {
    const err = errorResponse(error)
    return NextResponse.json({ error: 'Failed to fetch server', code: err.code }, { status: err.status })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateServerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: ErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      )
    }

    const existing = await prisma.postgresServer.findUnique({ where: { id } })
    if (!existing) return notFound()

    const server = await prisma.postgresServer.update({
      where: { id },
      data: parsed.data,
    })

    await createAuditLog({
      userId: auth.userId,
      action: 'POSTGRES_SERVER_UPDATED',
      resource: 'postgres_servers',
      resourceId: id,
      ipAddress: getIpFromRequest(request),
      status: 'SUCCESS',
      metadata: { changes: Object.keys(parsed.data) },
    })

    return NextResponse.json({ server })
  } catch (error: unknown) {
    const err = errorResponse(error)
    return NextResponse.json({ error: err.error, code: err.code }, { status: err.status })
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

    const existing = await prisma.postgresServer.findUnique({ where: { id } })
    if (!existing) return notFound()

    const userCount = await prisma.postgresUser.count({ where: { serverId: id } })
    if (userCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete server with ${userCount} active users. Remove users first.`, code: ErrorCodes.CONFLICT },
        { status: 409 }
      )
    }

    await prisma.postgresServer.delete({ where: { id } })

    try {
      await closePool(await resolveCredentials(existing.secretRef))
    } catch {}

    await createAuditLog({
      userId: auth.userId,
      action: 'POSTGRES_SERVER_DELETED',
      resource: 'postgres_servers',
      resourceId: id,
      ipAddress: getIpFromRequest(request),
      status: 'SUCCESS',
      metadata: { name: existing.name, host: existing.host },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const err = errorResponse(error)
    return NextResponse.json({ error: err.error, code: err.code }, { status: err.status })
  }
}
