// Seeds default settings. The full menu seed (from the Jan 2026 PDF) lands in Sprint 2.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const settings = {
  hours: { open: '10:00', close: '23:00', kitchenOpen: '11:30', kitchenClose: '22:30', days: 'Mon-Sun' },
  contact: { phone: '+65 6312 2847', whatsapp: '+65 8770 2077', email: 'info@brewgrillz.sg', address: '163 Rochor Road, Bugis Street, Singapore 188438' },
  pricing: { gstInclusive: true, dineInServiceChargePct: 10 },
}

async function main() {
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
  }
  console.log('Seeded settings:', Object.keys(settings).join(', '))
}

main().finally(() => prisma.$disconnect())
