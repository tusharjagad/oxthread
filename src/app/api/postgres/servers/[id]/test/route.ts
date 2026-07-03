import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { UserRole } from '@prisma/client'
import { testConnection } from '@/lib/postgres/pool'
import { resolveCredentials } from '@/lib/postgres/secrets'
import { errorResponse, ErrorCodes } from '@/lib/errors'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  try {
    const { id } = await params

    const server = await prisma.postgresServer.findUnique({ where: { id } })
    if (!server) {
      return NextResponse.json({ error: 'Server not found', code: ErrorCodes.NOT_FOUND }, { status: 404 })
    }

    const creds = await resolveCredentials(server.secretRef)
    const adminCreds = { ...creds, ssl: server.sslEnabled || creds.ssl, database: 'postgres' }

    const result = await testConnection(adminCreds)

    const newStatus = result.ok ? 'ACTIVE' : 'ERROR'
    await prisma.postgresServer.update({
      where: { id },
      data: { status: newStatus },
    })

    await createAuditLog({
      userId: auth.userId,
      action: 'POSTGRES_SERVER_TESTED',
      resource: 'postgres_servers',
      resourceId: id,
      ipAddress: getIpFromRequest(request),
      status: result.ok ? 'SUCCESS' : 'FAILURE',
      metadata: { name: server.name, host: server.host, error: result.error },
    })

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error, code: ErrorCodes.DB_CONNECTION_FAILED }, { status: 200 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const err = errorResponse(error)
    return NextResponse.json({ ok: false, error: err.error, code: err.code }, { status: 200 })
  }
}
