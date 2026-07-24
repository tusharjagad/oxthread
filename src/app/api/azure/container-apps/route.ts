import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { getContainerAppResource, updateContainerAppResource } from '@/lib/azure'
import { requireRole } from '@/lib/rbac'
import { UserRole } from '@prisma/client'

const resourceSchema = z.object({
  name: z.string().min(2).max(32).regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, 'App name must start with a letter and use lowercase letters, numbers, and hyphens'),
  resourceGroup: z.string().min(1).max(90),
  location: z.string().min(1).max(64),
  managedEnvironmentId: z.string().min(1).regex(/^\/subscriptions\//i, 'Enter the full managed environment resource ID'),
  containerName: z.string().min(1).max(63).regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Container name must use lowercase letters, numbers, and hyphens'),
  image: z.string().min(1).max(255),
  cpu: z.coerce.number().min(0.25).max(2),
  memory: z.string().regex(/^\d+(\.\d+)?(Gi|Mi)$/, 'Memory must use Mi or Gi, for example 0.5Gi'),
  targetPort: z.coerce.number().int().min(1).max(65535).optional(),
  includeRedis: z.boolean().default(false),
  redisContainerName: z.string().min(1).max(63).regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/).default('redis-settle'),
  redisImage: z.string().min(1).max(255).default('docker.io/redis:7.4'),
})

const REDIS_ARGS = ['-c', `if [ -f /data/appendonlydir/appendonly.aof.manifest ]; then
  echo "Checking and repairing AOF..."
  yes | redis-check-aof --fix /data/appendonlydir/appendonly.aof.manifest || true
fi
exec redis-server --dir /data --appendonly yes --maxmemory 384mb --maxmemory-policy noeviction`]

export async function POST(request: NextRequest) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  const parsed = resourceSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const config = parsed.data
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID
  if (!subscriptionId) return NextResponse.json({ error: 'Azure subscription not configured' }, { status: 500 })

  try {
    const existing = await getContainerAppResource(subscriptionId, config.resourceGroup, config.name)
    if (existing.resource) return NextResponse.json({ error: `Container App "${config.name}" already exists. Use Update instead.` }, { status: 409 })
    if (existing.status !== 404) return NextResponse.json({ error: 'Could not check whether the Container App already exists' }, { status: 502 })

    const containers: Record<string, unknown>[] = [{
      name: config.containerName,
      image: config.image,
      resources: { cpu: config.cpu, memory: config.memory },
    }]
    if (config.includeRedis) {
      containers.push({
        name: config.redisContainerName,
        image: config.redisImage,
        command: ['/bin/sh'],
        args: REDIS_ARGS,
        resources: { cpu: 0.25, memory: '0.5Gi' },
        probes: [],
      })
    }

    const resource = {
      location: config.location,
      properties: {
        managedEnvironmentId: config.managedEnvironmentId,
        ...(config.targetPort ? { configuration: { ingress: { external: true, targetPort: config.targetPort } } } : {}),
        template: { containers },
      },
    }
    const created = await updateContainerAppResource(subscriptionId, config.resourceGroup, config.name, resource)
    if (!created.resource) return NextResponse.json({ error: 'Azure rejected the Container App creation request' }, { status: 502 })

    await createAuditLog({
      userId: auth.userId, action: 'AZURE_CONTAINER_APP_CREATE', resource: 'container_apps', resourceId: config.name,
      ipAddress: getIpFromRequest(request), status: 'SUCCESS',
      metadata: { resourceGroup: config.resourceGroup, containerName: config.containerName, image: config.image, redisIncluded: config.includeRedis },
    })
    return NextResponse.json({ message: 'Container App creation started. Azure is provisioning a new revision.', name: config.name }, { status: 202 })
  } catch (error) {
    console.error('Container App creation error:', error)
    return NextResponse.json({ error: 'Failed to create the Container App' }, { status: 500 })
  }
}
