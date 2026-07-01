import { prisma } from '@/lib/prisma'

interface AuditLogParams {
  userId?: string | null
  action: string
  resource: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  status?: 'SUCCESS' | 'FAILURE' | 'WARNING'
  metadata?: Record<string, unknown>
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        status: params.status ?? 'SUCCESS',
        metadata: (params.metadata ?? {}) as never,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

export function getIpFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}
