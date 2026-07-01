export const ErrorCodes = {
  // Auth
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_ACCOUNT_DISABLED: 'AUTH_ACCOUNT_DISABLED',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTH_TOTP_REQUIRED: 'AUTH_TOTP_REQUIRED',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',

  // Database
  DB_CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED: 'DB_QUERY_FAILED',
  DB_DUPLICATE_ENTRY: 'DB_DUPLICATE_ENTRY',
  DB_NOT_FOUND: 'DB_NOT_FOUND',
  DB_FOREIGN_KEY: 'DB_FOREIGN_KEY',
  DB_ROLE_EXISTS: 'DB_ROLE_EXISTS',
  DB_PERMISSION_DENIED: 'DB_PERMISSION_DENIED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Resource
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',

  // External APIs
  GITHUB_API_ERROR: 'GITHUB_API_ERROR',
  WEBHOOK_INVALID_SIGNATURE: 'WEBHOOK_INVALID_SIGNATURE',

  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

const ERRORS_BY_CODE: Record<string, { error: string; code: ErrorCode; status: number }> = {
  // Prisma connection errors
  P1000: { error: 'Database authentication failed', code: ErrorCodes.DB_CONNECTION_FAILED, status: 503 },
  P1001: { error: 'Database server unreachable', code: ErrorCodes.DB_CONNECTION_FAILED, status: 503 },
  P1002: { error: 'Database connection timed out', code: ErrorCodes.DB_CONNECTION_FAILED, status: 504 },
  P1003: { error: 'Database does not exist', code: ErrorCodes.DB_NOT_FOUND, status: 404 },
  P1009: { error: 'Database already exists', code: ErrorCodes.DB_DUPLICATE_ENTRY, status: 409 },
  P1010: { error: 'Access denied to database', code: ErrorCodes.DB_PERMISSION_DENIED, status: 403 },

  // Prisma query errors
  P2000: { error: 'Value too long for column', code: ErrorCodes.VALIDATION_ERROR, status: 400 },
  P2002: { error: 'Record already exists', code: ErrorCodes.DB_DUPLICATE_ENTRY, status: 409 },
  P2003: { error: 'Related record not found', code: ErrorCodes.DB_FOREIGN_KEY, status: 400 },
  P2004: { error: 'Database constraint failed', code: ErrorCodes.DB_QUERY_FAILED, status: 400 },
  P2007: { error: 'Invalid data value', code: ErrorCodes.VALIDATION_ERROR, status: 400 },
  P2011: { error: 'Null constraint violation', code: ErrorCodes.VALIDATION_ERROR, status: 400 },
  P2014: { error: 'Required relation violation', code: ErrorCodes.DB_QUERY_FAILED, status: 400 },
  P2025: { error: 'Record not found', code: ErrorCodes.DB_NOT_FOUND, status: 404 },

  // Node.js connection errors
  ECONNREFUSED: { error: 'Database server not running', code: ErrorCodes.DB_CONNECTION_FAILED, status: 503 },
  ECONNRESET: { error: 'Database connection reset', code: ErrorCodes.DB_CONNECTION_FAILED, status: 503 },
  ETIMEDOUT: { error: 'Database connection timed out', code: ErrorCodes.DB_CONNECTION_FAILED, status: 504 },
  ENOTFOUND: { error: 'Database host not found', code: ErrorCodes.DB_CONNECTION_FAILED, status: 503 },

  // PostgreSQL server codes
  '42710': { error: 'Database role already exists', code: ErrorCodes.DB_ROLE_EXISTS, status: 409 },
  '3D000': { error: 'Database does not exist', code: ErrorCodes.DB_NOT_FOUND, status: 404 },
  '28P01': { error: 'Database authentication failed', code: ErrorCodes.DB_CONNECTION_FAILED, status: 403 },
}

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

export class AppError extends Error {
  code: ErrorCode
  status: number

  constructor(code: ErrorCode, message: string, status?: number) {
    super(message)
    this.code = code
    this.status = status ?? 500
    this.name = 'AppError'
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return { error: error.message, code: error.code, status: error.status }
  }

  const e = error as { code?: string; message?: string }

  // 1. Match by error code
  if (e.code && ERRORS_BY_CODE[e.code]) {
    return { ...ERRORS_BY_CODE[e.code] }
  }

  // 2. Catch-all PG class 5 (permission denied)
  if (typeof e.code === 'string' && e.code.startsWith('5')) {
    return { error: 'Database permission denied', code: ErrorCodes.DB_PERMISSION_DENIED, status: 403 }
  }

  // 3. Fallback: match by message keywords (code was missing/unmatched)
  const msg = (e.message || '').toLowerCase()
  if (msg.includes('reach database') || msg.includes('connection refused') || msg.includes('could not connect')) {
    return { error: 'Database server unreachable', code: ErrorCodes.DB_CONNECTION_FAILED, status: 503 }
  }
  if (msg.includes('authentication') && (msg.includes('failed') || msg.includes('denied'))) {
    return { error: 'Database authentication failed', code: ErrorCodes.DB_CONNECTION_FAILED, status: 403 }
  }
  if (msg.includes('does not exist') && (msg.includes('database') || msg.includes('relation'))) {
    return { error: 'Database not found', code: ErrorCodes.DB_NOT_FOUND, status: 404 }
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return { error: 'Database connection timed out', code: ErrorCodes.DB_CONNECTION_FAILED, status: 504 }
  }
  if (msg.includes('permission denied') || msg.includes('cannot')) {
    return { error: 'Database permission denied', code: ErrorCodes.DB_PERMISSION_DENIED, status: 403 }
  }

  return { error: 'Something went wrong', code: ErrorCodes.INTERNAL_ERROR, status: 500 }
}
