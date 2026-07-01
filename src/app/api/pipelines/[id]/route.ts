import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { UserRole } from '@prisma/client'
import { listWorkflowRuns } from '@/lib/github/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  const { id } = await params

  const pipeline = await prisma.pipeline.findUnique({ where: { id } })
  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
  }

  const workflowRuns = (pipeline.githubOrg && pipeline.githubRepo)
    ? await listWorkflowRuns(pipeline.githubOrg, pipeline.githubRepo, pipeline.githubBranch || undefined)
    : []

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { resourceId: id },
        ...(pipeline.githubOrg && pipeline.githubRepo
          ? [{ metadata: { path: ['repo'], equals: `${pipeline.githubOrg}/${pipeline.githubRepo}` } } as never]
          : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ pipeline, workflowRuns, auditLogs })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  const { id } = await params

  const pipeline = await prisma.pipeline.findUnique({ where: { id } })
  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
  }

  await prisma.pipeline.delete({ where: { id } })

  await createAuditLog({
    userId: auth.userId,
    action: 'PIPELINE_DELETED',
    resource: 'pipelines',
    resourceId: id,
    ipAddress: getIpFromRequest(request),
    status: 'SUCCESS',
  })

  return NextResponse.json({ success: true })
}
