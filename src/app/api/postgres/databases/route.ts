import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/rbac'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resolveCredentials } from '@/lib/postgres/secrets'
import { query } from '@/lib/postgres/pool'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { z } from 'zod'

const createDatabaseSchema = z.object({
  serverId: z.string().min(1, 'Server is required'),
  name: z.string().min(1, 'Database name is required').max(63).regex(/^[a-z_][a-z0-9_]*$/, 'Invalid database name. Use lowercase letters, numbers, and underscores.'),
  owner: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const parsed = createDatabaseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }, { status: 400 })
    }

    const { serverId, name, owner } = parsed.data

    const server = await prisma.postgresServer.findUnique({ where: { id: serverId } })
    if (!server) {
      return NextResponse.json({ error: 'Server not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    if (server.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Server is not active', code: 'SERVER_INACTIVE' }, { status: 400 })
    }

    const existing = await prisma.postgresDatabase.findUnique({
      where: { serverId_name: { serverId, name } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Database already exists on this server', code: 'CONFLICT' }, { status: 409 })
    }

    const creds = await resolveCredentials(server.secretRef)
    const adminCreds = { ...creds, ssl: server.sslEnabled || creds.ssl, database: 'postgres' }

    let createSql = `CREATE DATABASE "${name}"`
    if (owner) {
      createSql += ` OWNER "${owner}"`
    }

    await query(adminCreds, createSql)

    const db = await prisma.postgresDatabase.create({
      data: { name, owner: owner || auth.username, serverId },
    })

    await createAuditLog({
      userId: auth.userId,
      action: 'POSTGRES_DATABASE_CREATED',
      resource: 'postgres_databases',
      resourceId: db.id,
      ipAddress: getIpFromRequest(request),
      status: 'SUCCESS',
      metadata: { name, server: server.name, host: server.host },
    })

    return NextResponse.json({ database: db }, { status: 201 })
  } catch (error) {
    const message = (error as Error).message
    if (message.includes('already exists')) {
      return NextResponse.json({ error: 'Database already exists on the server', code: 'CONFLICT' }, { status: 409 })
    }
    return NextResponse.json({ error: `Failed to create database: ${message}`, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
