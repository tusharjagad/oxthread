import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getContainerAppResource, updateContainerAppResource } from '@/lib/azure'
import { requireRole } from '@/lib/rbac'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { UserRole } from '@prisma/client'

const REDIS_STARTUP_SCRIPT = `if [ -f /data/appendonlydir/appendonly.aof.manifest ]; then
  echo "Checking and repairing AOF..."
  yes | redis-check-aof --fix /data/appendonlydir/appendonly.aof.manifest || true
fi
exec redis-server --dir /data --appendonly yes --maxmemory 384mb --maxmemory-policy noeviction`

const redisSchema = z.object({
  resourceGroup: z.string().min(1).max(90),
  containerName: z.string().min(1).max(63).regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Container name must use lowercase letters, numbers, and hyphens').default('redis-settle'),
  image: z.string().min(1).max(255).default('docker.io/redis:7.4'),
  cpu: z.coerce.number().min(0.25).max(2).default(0.25),
  memory: z.string().regex(/^\d+(\.\d+)?(Gi|Mi)$/, 'Memory must use Mi or Gi, for example 0.5Gi').default('0.5Gi'),
  volumeName: z.string().min(1).max(63).optional(),
  subPath: z.string().min(1).max(256).default('redis-data'),
})

type Container = Record<string, unknown>

function getTemplate(resource: Record<string, unknown>) {
  const properties = resource.properties as Record<string, unknown> | undefined
  const template = properties?.template as Record<string, unknown> | undefined
  return { properties, template }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  const resourceGroup = request.nextUrl.searchParams.get('resourceGroup')
  const { name } = await params
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID
  if (!resourceGroup || !subscriptionId) {
    return NextResponse.json({ error: resourceGroup ? 'Azure subscription not configured' : 'Resource group is required' }, { status: 400 })
  }

  try {
    const result = await getContainerAppResource(subscriptionId, resourceGroup, name)
    if (!result.resource) return NextResponse.json({ error: 'Container App was not found' }, { status: result.status === 404 ? 404 : 502 })
    const { template } = getTemplate(result.resource)
    const containers = Array.isArray(template?.containers) ? template.containers as Container[] : []
    const volumes = Array.isArray(template?.volumes) ? template.volumes as Container[] : []
    return NextResponse.json({
      containers: containers.map((container) => ({ name: container.name, image: container.image })),
      volumes: volumes.map((volume) => volume.name).filter(Boolean),
    })
  } catch (error) {
    console.error('Redis container lookup error:', error)
    return NextResponse.json({ error: 'Failed to read the Container App configuration' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  const parsed = redisSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { name } = await params
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID
  if (!subscriptionId) return NextResponse.json({ error: 'Azure subscription not configured' }, { status: 500 })

  try {
    const current = await getContainerAppResource(subscriptionId, parsed.data.resourceGroup, name)
    if (!current.resource) return NextResponse.json({ error: `Container App "${name}" was not found` }, { status: current.status === 404 ? 404 : 502 })

    const { properties, template } = getTemplate(current.resource)
    if (!properties || !template || !Array.isArray(template.containers)) {
      return NextResponse.json({ error: 'Container App template is missing containers' }, { status: 422 })
    }

    const volumes = Array.isArray(template.volumes) ? template.volumes as Container[] : []
    if (parsed.data.volumeName && !volumes.some((volume) => volume.name === parsed.data.volumeName)) {
      return NextResponse.json({ error: `Volume "${parsed.data.volumeName}" is not defined on this Container App` }, { status: 400 })
    }

    const redisContainer: Container = {
      name: parsed.data.containerName,
      image: parsed.data.image,
      command: ['/bin/sh'],
      args: ['-c', REDIS_STARTUP_SCRIPT],
      resources: { cpu: parsed.data.cpu, memory: parsed.data.memory },
      probes: [],
      ...(parsed.data.volumeName ? {
        volumeMounts: [{ volumeName: parsed.data.volumeName, mountPath: '/data', subPath: parsed.data.subPath }],
      } : {}),
    }

    const containers = template.containers as Container[]
    const existingIndex = containers.findIndex((container) => container.name === parsed.data.containerName)
    const nextContainers = [...containers]
    if (existingIndex === -1) nextContainers.push(redisContainer)
    else nextContainers[existingIndex] = redisContainer

    // Azure's GET response includes status-only fields such as provisioningState.
    // Send only writable resource fields so an update does not replay those fields.
    const nextProperties = {
      managedEnvironmentId: properties.managedEnvironmentId,
      configuration: properties.configuration,
      template: { ...template, containers: nextContainers },
      workloadProfileName: properties.workloadProfileName,
    }
    const nextResource = {
      location: current.resource.location,
      ...(current.resource.tags ? { tags: current.resource.tags } : {}),
      ...(current.resource.identity ? { identity: current.resource.identity } : {}),
      properties: nextProperties,
    }
    const updated = await updateContainerAppResource(subscriptionId, parsed.data.resourceGroup, name, nextResource)
    if (!updated.resource) return NextResponse.json({ error: 'Azure rejected the Container App update' }, { status: 502 })

    await createAuditLog({
      userId: auth.userId,
      action: existingIndex === -1 ? 'AZURE_REDIS_CONTAINER_CREATE' : 'AZURE_REDIS_CONTAINER_UPDATE',
      resource: 'container_apps',
      resourceId: name,
      ipAddress: getIpFromRequest(request),
      status: 'SUCCESS',
      metadata: { resourceGroup: parsed.data.resourceGroup, containerName: parsed.data.containerName, image: parsed.data.image, volumeName: parsed.data.volumeName ?? null },
    })

    return NextResponse.json({
      message: existingIndex === -1 ? 'Redis container added. Azure is creating a new revision.' : 'Redis container updated. Azure is creating a new revision.',
      action: existingIndex === -1 ? 'created' : 'updated',
    })
  } catch (error) {
    console.error('Redis container update error:', error)
    await createAuditLog({
      userId: auth.userId, action: 'AZURE_REDIS_CONTAINER_UPDATE', resource: 'container_apps', resourceId: name,
      ipAddress: getIpFromRequest(request), status: 'FAILURE', metadata: { error: (error as Error).message },
    })
    return NextResponse.json({ error: 'Failed to update the Redis container' }, { status: 500 })
  }
}
