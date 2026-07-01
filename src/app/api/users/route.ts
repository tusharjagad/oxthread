import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { hashPassword, generateAccessKey } from '@/lib/auth-utils'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { UserRole } from '@prisma/client'

// GET /api/users — list all users
export async function GET(request: NextRequest) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const search = searchParams.get('search') || ''

  const where = search
    ? { username: { contains: search, mode: 'insensitive' as const } }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        accessKey: true,
        role: true,
        isActive: true,
        isLocked: true,
        totpEnabled: true,
        expiry: true,
        lastLogin: true,
        createdAt: true,
        failedLogins: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ users, total, page, limit })
}

// POST /api/users — create a new user
export async function POST(request: NextRequest) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const { username, password, role, expiry, ipAllowlist } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const accessKey = generateAccessKey()

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        accessKey,
        role: role || UserRole.DEVELOPER,
        expiry: expiry ? new Date(expiry) : null,
        ipAllowlist: ipAllowlist || [],
      },
      select: {
        id: true,
        username: true,
        accessKey: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    await createAuditLog({
      userId: auth.userId,
      action: 'USER_CREATED',
      resource: 'users',
      resourceId: user.id,
      ipAddress: getIpFromRequest(request),
      status: 'SUCCESS',
      metadata: { username, role },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
