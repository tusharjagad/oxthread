import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { UserRole } from '@prisma/client'
import { createAccessRequestSchema } from '@/lib/validations/postgresql'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const status = searchParams.get('status') || ''
    const userId = searchParams.get('userId') || ''

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (userId) where.userId = userId

    const [requests, total] = await Promise.all([
      prisma.accessRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          server: { select: { name: true, host: true } },
        },
      }),
      prisma.accessRequest.count({ where }),
    ])

    return NextResponse.json({ requests, total, page, limit })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch access requests' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const parsed = createAccessRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { serverId, databaseName, accessProfile, reason, expiresAt } = parsed.data

    const server = await prisma.postgresServer.findUnique({ where: { id: serverId } })
    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    const accessRequest = await prisma.accessRequest.create({
      data: {
        userId: auth.userId,
        username: auth.username,
        serverId,
        databaseName,
        accessProfile,
        reason,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    await createAuditLog({
      userId: auth.userId,
      action: 'ACCESS_REQUEST_CREATED',
      resource: 'access_requests',
      resourceId: accessRequest.id,
      ipAddress: getIpFromRequest(request),
      status: 'SUCCESS',
      metadata: { server: server.name, databaseName, accessProfile, reason },
    })

    return NextResponse.json({ request: accessRequest }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
