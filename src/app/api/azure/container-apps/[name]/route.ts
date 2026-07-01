import { NextRequest, NextResponse } from 'next/server'
import { getContainerAppInfo } from '@/lib/azure'
import { requireRole } from '@/lib/rbac'

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
