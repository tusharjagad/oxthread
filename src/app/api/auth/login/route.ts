import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth-utils'
import { createSession, getSessionTimeoutMinutes } from '@/lib/session'
import { createAuditLog, getIpFromRequest } from '@/lib/audit'
import { errorResponse, ErrorCodes } from '@/lib/errors'

const COOKIE_NAME = 'oxthread-session'
const MAX_FAILED = 6

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessKey, password } = body

    if (!accessKey || !password) {
      return NextResponse.json(
        { error: 'Access key and password are required', code: ErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { accessKey } })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials', code: ErrorCodes.AUTH_INVALID_CREDENTIALS },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is disabled', code: ErrorCodes.AUTH_ACCOUNT_DISABLED },
        { status: 403 }
      )
    }

    if (user.isLocked) {
      return NextResponse.json(
        { error: 'Account is locked due to too many failed attempts', code: ErrorCodes.AUTH_ACCOUNT_LOCKED },
        { status: 423 }
      )
    }

    if (user.expiry && user.expiry < new Date()) {
      return NextResponse.json(
        { error: 'Account has expired', code: ErrorCodes.AUTH_FORBIDDEN },
        { status: 403 }
      )
    }

    const valid = await verifyPassword(password, user.passwordHash)

    if (!valid) {
      const failedLogins = user.failedLogins + 1
      const isLocked = failedLogins >= MAX_FAILED

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLogins, isLocked },
      })

      await createAuditLog({
        userId: user.id,
        action: 'LOGIN_FAILED',
        resource: 'auth',
        ipAddress: getIpFromRequest(request),
        status: 'FAILURE',
        metadata: { failedAttempt: failedLogins },
      })

      if (isLocked) {
        return NextResponse.json(
          { error: 'Account locked after too many failed attempts', code: ErrorCodes.AUTH_ACCOUNT_LOCKED },
          { status: 423 }
        )
      }

      return NextResponse.json(
        { error: 'Invalid credentials', code: ErrorCodes.AUTH_INVALID_CREDENTIALS },
        { status: 401 }
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lastLogin: new Date() },
    })

    if (user.totpEnabled) {
      const partialToken = await createSession({
        userId: user.id,
        username: user.username,
        role: user.role,
      })
      return NextResponse.json({ requireTotp: true, partialToken })
    }

    const token = await createSession({
      userId: user.id,
      username: user.username,
      role: user.role,
    })

    const timeout = await getSessionTimeoutMinutes()
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role },
    })
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: timeout * 60,
      path: '/',
    })

    await createAuditLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      resource: 'auth',
      ipAddress: getIpFromRequest(request),
      status: 'SUCCESS',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    const err = errorResponse(error)
    return NextResponse.json({ error: err.error, code: err.code }, { status: err.status })
  }
}
