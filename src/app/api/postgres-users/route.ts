import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { UserRole, DbUserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const search = searchParams.get('search') || ''
  const server = searchParams.get('server') || ''

  const where: Record<string, unknown> = {}
  if (search) where.username = { contains: search, mode: 'insensitive' }
  if (server) where.server = server

  const [pgUsers, total] = await Promise.all([
    prisma.postgresUser.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.postgresUser.count({ where }),
  ])

  return NextResponse.json({ pgUsers, total, page, limit })
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const { username, server, databaseName, role, expiry } = body

    if (!username || !server || !databaseName) {
      return NextResponse.json(
        { error: 'Username, server, and database name are required' },
        { status: 400 }
      )
    }

    const pgUser = await prisma.postgresUser.create({
      data: {
        username,
        server,
        databaseName,
        role: (role as DbUserRole) || DbUserRole.READ_ONLY,
        expiry: expiry ? new Date(expiry) : null,
        createdBy: auth.userId,
      },
    })

    await createAuditLog({
      userId: auth.userId,
      action: 'POSTGRES_USER_CREATED',
      resource: 'postgres_users',
      resourceId: pgUser.id,
      ipAddress: getIpFromRequest(request),
      status: 'SUCCESS',
      metadata: { username, server, databaseName, role },
    })

    return NextResponse.json({ pgUser }, { status: 201 })
  } catch (error: unknown) {
    const e = error as { code?: string }
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'User already exists on this server/database' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
