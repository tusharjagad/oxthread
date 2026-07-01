import { z } from 'zod'

export const createServerSchema = z.object({
  name: z.string().min(1, 'Server name is required').max(100),
  environment: z.enum(['development', 'staging', 'production', 'dr']).default('development'),
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().int().min(1).max(65535).default(5432),
  sslEnabled: z.boolean().default(true),
  ownerTeam: z.string().optional(),
  secretRef: z.string().min(1, 'Secret reference is required'),
})

export const updateServerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  environment: z.enum(['development', 'staging', 'production', 'dr']).optional(),
  host: z.string().min(1).optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  sslEnabled: z.boolean().optional(),
  ownerTeam: z.string().optional(),
  secretRef: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ERROR']).optional(),
})

export const createUserSchema = z.object({
  serverId: z.string().uuid('Invalid server'),
  databaseId: z.string().uuid('Invalid database').optional(),
  databaseName: z.string().min(1, 'Database name is required'),
  username: z
    .string()
    .min(1, 'Username is required')
    .max(63)
    .regex(/^[a-z][a-z0-9_]*$/, 'Username must start with a letter and contain only lowercase letters, numbers, and underscores'),
  accessProfile: z.enum(['APP_READONLY', 'APP_READWRITE', 'APP_ADMIN']).default('APP_READWRITE'),
  expiry: z.string().optional(),
})

export const rotatePasswordSchema = z.object({
  newPassword: z.string().min(16, 'Password must be at least 16 characters').optional(),
})

export const createAccessRequestSchema = z.object({
  serverId: z.string().uuid('Invalid server'),
  databaseId: z.string().uuid('Invalid database').optional(),
  databaseName: z.string().min(1, 'Database name is required'),
  accessProfile: z.enum(['APP_READONLY', 'APP_READWRITE', 'APP_ADMIN']),
  reason: z.string().min(1, 'Reason is required').max(500),
  expiresAt: z.string().optional(),
})

export const approveAccessRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
  databaseId: z.string().uuid('Invalid database').optional(),
})
