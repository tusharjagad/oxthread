import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create admin user if it doesn't exist
  const adminExists = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' }
  })

  if (!adminExists) {
    const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345!'
    const passwordHash = await bcrypt.hash(password, 12)
    const accessKey = `OXT-${crypto.randomBytes(16).toString('hex').toUpperCase()}`

    const admin = await prisma.user.create({
      data: {
        username: process.env.SEED_ADMIN_USERNAME || 'admin',
        accessKey,
        passwordHash,
        role: 'SUPER_ADMIN',
      }
    })

    console.log(`✅ Admin user created!`)
    console.log(`Username:   ${admin.username}`)
    console.log(`Access Key: ${admin.accessKey}`)
    console.log(`Password:   ${password}`)
    console.log(`Role:       SUPER_ADMIN`)
  } else {
    console.log('Admin user already exists.')
  }

  // Create initial app settings if not exists
  const settingsExist = await prisma.appSettings.findFirst()
  if (!settingsExist) {
    const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
    await prisma.appSettings.create({
      data: {
        sessionTimeoutMinutes: 30,
        updatedBy: admin?.id,
      },
    })
    console.log('✅ App settings created (session timeout: 30 min).')
  } else {
    console.log('App settings already exist.')
  }

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
