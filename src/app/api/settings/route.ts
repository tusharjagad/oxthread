import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { z } from 'zod'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'

const updateSchema = z.object({
  sessionTimeoutMinutes: z.number().int().min(1).max(1440),
})

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'SUPER_ADMIN')
  if (!auth.ok) return auth.response

  try {
    let settings = await prisma.appSettings.findFirst()
    if (!settings) {
      settings = await prisma.appSettings.create({
        data: { sessionTimeoutMinutes: 30, updatedBy: auth.userId },
      })
    }

    return NextResponse.json({
      sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
    })
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireRole(request, 'SUPER_ADMIN')
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    let settings = await prisma.appSettings.findFirst()
    if (!settings) {
      settings = await prisma.appSettings.create({
        data: { sessionTimeoutMinutes: 30, updatedBy: auth.userId },
      })
    }

    await prisma.appSettings.update({
      where: { id: settings.id },
      data: {
        sessionTimeoutMinutes: parsed.data.sessionTimeoutMinutes,
        updatedBy: auth.userId,
      },
    })

    await createAuditLog({
      userId: auth.userId,
      action: 'UPDATE_SETTINGS',
      resource: 'settings',
      resourceId: settings.id,
      ipAddress: getIpFromRequest(request),
      metadata: {
        previousTimeout: settings.sessionTimeoutMinutes,
        newTimeout: parsed.data.sessionTimeoutMinutes,
      },
    })

    return NextResponse.json({
      sessionTimeoutMinutes: parsed.data.sessionTimeoutMinutes,
    })
  } catch (error) {
    console.error('Failed to update settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
