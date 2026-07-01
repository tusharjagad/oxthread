import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production'
)

const COOKIE_NAME = 'oxthread-session'

export interface SessionPayload {
  userId: string
  username: string
  role: string
  iat?: number
  exp?: number
}

export async function getSessionTimeoutMinutes(): Promise<number> {
  try {
    const settings = await prisma.appSettings.findFirst()
    if (settings?.sessionTimeoutMinutes) return settings.sessionTimeoutMinutes
  } catch {}
  const fromEnv = parseInt(process.env.SESSION_EXPIRY_MINUTES || '', 10)
  if (!isNaN(fromEnv)) return fromEnv
  return 30
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const timeout = await getSessionTimeoutMinutes()
  const expiresAt = new Date(Date.now() + timeout * 60 * 1000)

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(JWT_SECRET)

  return token
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySession(token)
}

export async function setSessionCookie(token: string): Promise<void> {
  const timeout = await getSessionTimeoutMinutes()
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: timeout * 60,
    path: '/',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
