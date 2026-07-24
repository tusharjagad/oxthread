import { NextRequest, NextResponse } from 'next/server'
import { getContainerAppInfo, getContainerAppResource, updateContainerAppResource } from '@/lib/azure'
import { requireRole } from '@/lib/rbac'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

const updateSchema = z.object({
  resourceGroup: z.string().min(1).max(90),
  containerName: z.string().min(1).max(63),
  image: z.string().min(1).max(255),
  cpu: z.coerce.number().min(0.25).max(2),
  memory: z.string().regex(/^\d+(\.\d+)?(Gi|Mi)$/),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const auth = requireRole(request, 'DEVELOPER')
  if (!auth.ok) return auth.response

  try {
    const { name } = await params
    if (!name) {
      return NextResponse.json(
        { error: 'Container app name is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Azure subscription not configured', code: 'INTERNAL_ERROR' },
        { status: 500 }
      )
    }

    const info = await getContainerAppInfo(name, subscriptionId)
    if (!info.exists) {
      return NextResponse.json(
        { error: `Container app "${name}" not found in subscription`, code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      name,
      resourceGroup: info.resourceGroup,
      acrName: info.acrName,
      acrLoginServer: info.acrLoginServer,
      location: info.location,
    })
  } catch (error) {
    console.error('Container app lookup error:', error)
    return NextResponse.json(
      { error: 'Failed to look up container app', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const auth = requireRole(request, UserRole.DEVELOPER)
  if (!auth.ok) return auth.response

  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { name } = await params
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID
  if (!subscriptionId) return NextResponse.json({ error: 'Azure subscription not configured' }, { status: 500 })

  try {
    const current = await getContainerAppResource(subscriptionId, parsed.data.resourceGroup, name)
    if (!current.resource) return NextResponse.json({ error: `Container App "${name}" was not found` }, { status: current.status === 404 ? 404 : 502 })
    const properties = current.resource.properties as Record<string, unknown> | undefined
    const template = properties?.template as Record<string, unknown> | undefined
    const containers = Array.isArray(template?.containers) ? template.containers as Record<string, unknown>[] : []
    const index = containers.findIndex((container) => container.name === parsed.data.containerName)
    if (index === -1) return NextResponse.json({ error: `Container "${parsed.data.containerName}" was not found on this Container App` }, { status: 404 })

    const nextContainers = [...containers]
    nextContainers[index] = { ...containers[index], image: parsed.data.image, resources: { cpu: parsed.data.cpu, memory: parsed.data.memory } }
    const resource = {
      location: current.resource.location,
      ...(current.resource.tags ? { tags: current.resource.tags } : {}),
      ...(current.resource.identity ? { identity: current.resource.identity } : {}),
      properties: {
        managedEnvironmentId: properties?.managedEnvironmentId,
        configuration: properties?.configuration,
        template: { ...template, containers: nextContainers },
        workloadProfileName: properties?.workloadProfileName,
      },
    }
    const updated = await updateContainerAppResource(subscriptionId, parsed.data.resourceGroup, name, resource)
    if (!updated.resource) return NextResponse.json({ error: 'Azure rejected the Container App update' }, { status: 502 })
    await createAuditLog({
      userId: auth.userId, action: 'AZURE_CONTAINER_APP_UPDATE', resource: 'container_apps', resourceId: name,
      ipAddress: getIpFromRequest(request), status: 'SUCCESS',
      metadata: { resourceGroup: parsed.data.resourceGroup, containerName: parsed.data.containerName, image: parsed.data.image },
    })
    return NextResponse.json({ message: 'Container App update started. Azure is creating a new revision.' }, { status: 202 })
  } catch (error) {
    console.error('Container App update error:', error)
    return NextResponse.json({ error: 'Failed to update the Container App' }, { status: 500 })
  }
}
