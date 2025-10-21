// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = 'pass123'
  const hash = await bcrypt.hash(password, 10)

  await prisma.user.upsert({
    where: { username: 'admin' },           // ✅ ใช้คีย์ที่ unique
    update: { passwordHash: hash, role: 'ADMIN' },
    create: {
      email: 'admin@example.com',
      username: 'admin',
      passwordHash: hash,
      role: 'ADMIN',
    },
  })

  await prisma.user.upsert({
    where: { username: 'trainer' },
    update: { passwordHash: hash, role: 'TRAINER' },
    create: {
      email: 'trainer@example.com',
      username: 'trainer',
      passwordHash: hash,
      role: 'TRAINER',
    },
  })

  await prisma.user.upsert({
    where: { username: 'emp' },
    update: { passwordHash: hash, role: 'EMPLOYEE' },
    create: {
      email: 'emp@example.com',
      username: 'emp',
      passwordHash: hash,
      role: 'EMPLOYEE',
    },
  })

  console.log('Seeded users: admin / trainer / emp (password: pass123)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
