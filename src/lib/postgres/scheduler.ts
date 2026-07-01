import { prisma } from '@/lib/prisma'
import { disableUser } from './provisioning'

export async function processExpiredUsers(): Promise<{ expired: number; errors: number }> {
  const now = new Date()

  const expired = await prisma.postgresUser.findMany({
    where: {
      expiry: { lte: now },
      isActive: true,
      serverId: { not: null },
    },
    include: {
      serverRef: true,
    },
  })

  let expiredCount = 0
  let errorCount = 0

  for (const user of expired) {
    try {
      if (!user.serverRef) {
        await prisma.postgresUser.update({
          where: { id: user.id },
          data: { isActive: false },
        })
        expiredCount++
        continue
      }

      await disableUser(user.serverRef.secretRef, user.username)

      await prisma.postgresUser.update({
        where: { id: user.id },
        data: { isActive: false },
      })

      await prisma.auditLog.create({
        data: {
          userId: user.createdBy,
          action: 'POSTGRES_USER_EXPIRED',
          resource: 'postgres_users',
          resourceId: user.id,
          status: 'SUCCESS',
          metadata: { username: user.username, server: user.server },
        },
      })

      expiredCount++
    } catch {
      await prisma.auditLog.create({
        data: {
          userId: user.createdBy,
          action: 'POSTGRES_USER_EXPIRY_FAILED',
          resource: 'postgres_users',
          resourceId: user.id,
          status: 'FAILURE',
          metadata: { username: user.username, server: user.server },
        },
      })
      errorCount++
    }
  }

  return { expired: expiredCount, errors: errorCount }
}

export async function processExpiredAccessRequests(): Promise<number> {
  const now = new Date()

  const result = await prisma.accessRequest.updateMany({
    where: {
      expiresAt: { lte: now },
      status: { in: ['PENDING', 'APPROVED'] },
    },
    data: {
      status: 'EXPIRED',
    },
  })

  return result.count
}
