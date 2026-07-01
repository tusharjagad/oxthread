import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  const [secrets, total] = await Promise.all([
    prisma.secret.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyVaultRef: true,
        description: true,
        environment: true,
        rotatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.secret.count(),
  ])

  return NextResponse.json({ secrets, total, page, limit })
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const { name, value, description, environment } = body

    if (!name || !value) {
      return NextResponse.json({ error: 'Name and value are required' }, { status: 400 })
    }

    // In a real implementation, this would integrate with Azure Key Vault
    // to store the actual secret value. We just store the reference in DB.
    const keyVaultRef = `https://example.vault.azure.net/secrets/${name}`

    const secret = await prisma.secret.create({
      data: {
        name,
        keyVaultRef,
        description,
        environment: environment || 'production',
        createdBy: auth.userId,
      },
    })

    await createAuditLog({
      userId: auth.userId,
      action: 'SECRET_CREATED',
      resource: 'secrets',
      resourceId: secret.id,
      ipAddress: getIpFromRequest(request),
      status: 'SUCCESS',
      metadata: { name, environment },
    })

    return NextResponse.json({ secret }, { status: 201 })
  } catch (error: unknown) {
    const e = error as { code?: string }
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Secret with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
