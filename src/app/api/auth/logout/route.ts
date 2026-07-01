import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/session'
import { requireAuth } from '@/lib/rbac'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if (auth.ok) {
    await createAuditLog({
      userId: auth.userId,
      action: 'LOGOUT',
      resource: 'auth',
      ipAddress: getIpFromRequest(request),
      status: 'SUCCESS',
    })
  }
  await clearSessionCookie()
  return NextResponse.json({ success: true })
}
