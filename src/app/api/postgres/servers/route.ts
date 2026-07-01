import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { UserRole } from '@prisma/client'
import { createServerSchema } from '@/lib/validations/postgresql'
import { errorResponse, ErrorCodes } from '@/lib/errors'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const environment = searchParams.get('environment') || ''

    const where: Record<string, unknown> = {}
    if (search) where.name = { contains: search, mode: 'insensitive' }
    if (status) where.status = status
    if (environment) where.environment = environment

    const [servers, total] = await Promise.all([
      prisma.postgresServer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.postgresServer.count({ where }),
    ])

    return NextResponse.json({ servers, total, page, limit })
  } catch (error) {
    const err = errorResponse(error)
    return NextResponse.json({ error: 'Failed to fetch servers', code: err.code }, { status: err.status })
  }
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const parsed = createServerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: ErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      )
    }

    const server = await prisma.postgresServer.create({
      data: {
        ...parsed.data,
        createdBy: auth.userId,
      },
    })

    await createAuditLog({
      userId: auth.userId,
      action: 'POSTGRES_SERVER_CREATED',
      resource: 'postgres_servers',
      resourceId: server.id,
      ipAddress: getIpFromRequest(request),
      status: 'SUCCESS',
      metadata: { name: server.name, host: server.host, environment: server.environment },
    })

    return NextResponse.json({ server }, { status: 201 })
  } catch (error: unknown) {
    const err = errorResponse(error)
    return NextResponse.json({ error: err.error, code: err.code }, { status: err.status })
  }
}
