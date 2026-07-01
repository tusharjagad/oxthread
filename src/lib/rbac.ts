import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { UserRole } from '@prisma/client'

type RoleCheckResult =
  | { ok: true; userId: string; username: string; role: string }
  | { ok: false; response: NextResponse }

const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  DEVELOPER: 2,
  READ_ONLY: 1,
}

export function hasRole(userRole: string, requiredRole: UserRole): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0)
}

export function requireAuth(request: NextRequest): RoleCheckResult {
  const userId = request.headers.get('x-user-id')
  const username = request.headers.get('x-username')
  const role = request.headers.get('x-user-role')

  if (!userId || !username || !role) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { ok: true, userId, username, role }
}

export function requireRole(
  request: NextRequest,
  requiredRole: UserRole
): RoleCheckResult {
  const authResult = requireAuth(request)
  if (!authResult.ok) return authResult

  if (!hasRole(authResult.role, requiredRole)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Forbidden. Required role: ${requiredRole}` },
        { status: 403 }
      ),
    }
  }

  return authResult
}
