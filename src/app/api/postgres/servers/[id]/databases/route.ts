import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { requireRole } from '@/lib/rbac'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { discoverDatabases, syncDatabases } from '@/lib/postgres/discovery'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  const { id } = await params

  try {
    const databases = await discoverDatabases(id)
    return NextResponse.json({ databases })
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to discover databases: ${(error as Error).message}` },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, UserRole.ADMIN)
  if (!auth.ok) return auth.response

  const { id } = await params

  try {
    const synced = await syncDatabases(id)

    await createAuditLog({
      userId: auth.userId,
      action: 'POSTGRES_DATABASES_SYNCED',
      resource: 'postgres_servers',
      resourceId: id,
      ipAddress: getIpFromRequest(request),
      status: 'SUCCESS',
      metadata: { databasesSynced: synced },
    })

    return NextResponse.json({ synced })
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to sync databases: ${(error as Error).message}` },
      { status: 500 }
    )
  }
}
