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
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  const [pipelines, total] = await Promise.all([
    prisma.pipeline.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.pipeline.count(),
  ])

  return NextResponse.json({ pipelines, total, page, limit })
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  const body = await request.json()
  const { appName, repoUrl, framework, dockerfilePath, azureRegion, containerApp } = body

  if (!appName || !repoUrl || !framework) {
    return NextResponse.json({ error: 'appName, repoUrl, and framework are required' }, { status: 400 })
  }

  const pipeline = await prisma.pipeline.create({
    data: {
      appName,
      repoUrl,
      framework,
      dockerfilePath: dockerfilePath || './Dockerfile',
      azureRegion: azureRegion || 'eastus',
      containerApp: containerApp || appName.toLowerCase(),
      createdBy: auth.userId,
    },
  })

  await createAuditLog({
    userId: auth.userId,
    action: 'PIPELINE_CREATED',
    resource: 'pipelines',
    resourceId: pipeline.id,
    ipAddress: getIpFromRequest(request),
    status: 'SUCCESS',
    metadata: { appName, framework },
  })

  return NextResponse.json({ pipeline }, { status: 201 })
}
