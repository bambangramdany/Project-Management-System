/**
 * Jalankan dengan DATABASE_URL produksi:
 *   DATABASE_URL="postgresql://..." node scripts/set-level-passwords.js
 */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

// Password per level — sesuaikan jika ingin ganti
const LEVEL_PASSWORDS = {
  DIRECTOR:        'Wmark@Dir26',
  PROJECT_MANAGER: 'Wmark@PM26',
  PRODUCER:        'Wmark@PM26',
  PRODUCTION:      'Wmark@PO26',
  PROJECT_OFFICER: 'Wmark@PO26',
  CREATIVE_LEAD:   'Wmark@PO26',
  GRAPHIC_DESIGNER:'Wmark@PO26',
  STAGE_DESIGNER:  'Wmark@PO26',
  CONTENT_CREATOR: 'Wmark@PO26',
  EDITOR:          'Wmark@PO26',
  MEMBER:          'Wmark@PO26',
  INTERNSHIP:      'Wmark@PO26',
  FINANCE:         'Wmark@Fin26',
  FINANCE_STAFF:   'Wmark@Fin26',
}

async function main() {
  const users = await prisma.user.findMany({
    where: { employeeStatus: 'ACTIVE', role: { not: 'OWNER' } },
    select: { id: true, name: true, email: true, role: true },
  })

  for (const user of users) {
    const pass = LEVEL_PASSWORDS[user.role]
    if (!pass) { console.log('SKIP (no mapping):', user.role, user.name); continue }
    const hash = await bcrypt.hash(pass, 10)
    await prisma.user.update({ where: { id: user.id }, data: { hashedPassword: hash } })
    console.log(`OK  [${user.role}] ${user.name} → ${pass}`)
  }
  console.log('\nSelesai.')
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
