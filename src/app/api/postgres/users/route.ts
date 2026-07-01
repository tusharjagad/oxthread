import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { UserRole, AccessProfile } from '@prisma/client'
import { createUserSchema } from '@/lib/validations/postgresql'
import { createPostgresUser, generatePassword } from '@/lib/postgres/provisioning'
import { hashPassword } from '@/lib/auth-utils'
import { errorResponse, ErrorCodes } from '@/lib/errors'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const search = searchParams.get('search') || ''
    const serverId = searchParams.get('serverId') || ''
    const databaseId = searchParams.get('databaseId') || ''

    const where: Record<string, unknown> = {}
    if (search) where.username = { contains: search, mode: 'insensitive' }
    if (serverId) where.serverId = serverId
    if (databaseId) where.databaseId = databaseId

    const [pgUsers, total] = await Promise.all([
      prisma.postgresUser.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          serverRef: { select: { name: true, host: true } },
          databaseRef: { select: { name: true } },
        },
      }),
      prisma.postgresUser.count({ where }),
    ])

    return NextResponse.json({ pgUsers, total, page, limit })
  } catch (error) {
    const err = errorResponse(error)
    return NextResponse.json({ error: 'Failed to fetch users', code: err.code }, { status: err.status })
  }
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { serverId, databaseId, username, databaseName, accessProfile, expiry } = parsed.data

    const server = await prisma.postgresServer.findUnique({ where: { id: serverId } })
    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    if (server.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Server is not active' }, { status: 400 })
    }

    if (accessProfile === 'APP_ADMIN') {
      const requesterRole = auth.role
      const authResult = requireRole(request, UserRole.SUPER_ADMIN)
      if (!authResult.ok && requesterRole !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'APP_ADMIN profile requires SUPER_ADMIN approval' },
          { status: 403 }
        )
      }
    }

    const password = generatePassword()

    await createPostgresUser(
      {
        host: server.host,
        port: server.port,
        ssl: server.sslEnabled,
        secretRef: server.secretRef,
      },
      {
        username,
        password,
        databaseName,
        accessProfile: accessProfile as AccessProfile,
      }
    )

    const passwordHash = await hashPassword(password)

    const pgUser = await prisma.postgresUser.create({
      data: {
        username,
        server: server.name,
        databaseName,
        role: 'READ_WRITE',
        accessProfile: accessProfile as AccessProfile,
        isActive: true,
        expiry: expiry ? new Date(expiry) : null,
        passwordHash,
        createdBy: auth.userId,
        serverId: server.id,
        databaseId: databaseId || null,
      },
    })

    await createAuditLog({
      userId: auth.userId,
      action: 'POSTGRES_USER_CREATED',
      resource: 'postgres_users',
      resourceId: pgUser.id,
      ipAddress: getIpFromRequest(request),
      status: 'SUCCESS',
      metadata: { username, server: server.name, databaseName, accessProfile, host: server.host },
    })

    return NextResponse.json(
      { pgUser, password },
      { status: 201 }
    )
  } catch (error: unknown) {
    const err = errorResponse(error)
    if (err.code === ErrorCodes.DB_DUPLICATE_ENTRY) {
      err.error = 'User already exists on this server/database'
    }
    return NextResponse.json({ error: err.error, code: err.code }, { status: err.status })
  }
}
