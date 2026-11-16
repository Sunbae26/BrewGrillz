// Seeds settings + the full menu from client/src/data/menu.json.  Run: npm run db:seed  (safe to re-run)
import { PrismaClient } from '@prisma/client'
import { loadMenuJson } from '../src/lib/menuData.js'

const prisma = new PrismaClient()
const cents = (n) => (n == null ? null : Math.round(n * 100))

const settings = {
  hours: { open: '10:00', close: '23:00', kitchenOpen: '11:30', kitchenClose: '22:30', days: 'Mon-Sun' },
  contact: { phone: '+65 6312 2847', whatsapp: '+65 8770 2077', email: 'info@brewgrillz.sg', address: '163 Rochor Road, Bugis Street, Singapore 188438' },
  pricing: { gstInclusive: true, dineInServiceChargePct: 10 },
}

async function main() {
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
  }

  const menu = loadMenuJson()
  let items = 0
  for (const [ci, c] of menu.categories.entries()) {
    const cat = await prisma.menuCategory.upsert({
      where: { slug: c.id },
      update: { name: c.name, type: c.group === 'drinks' ? 'DRINK' : 'FOOD', note: c.note ?? null, sort: ci },
      create: { slug: c.id, name: c.name, type: c.group === 'drinks' ? 'DRINK' : 'FOOD', note: c.note ?? null, sort: ci },
    })

    // food categories have items; drinks categories have sections → rows
    const rows = c.items
      ? c.items.map((it) => ({ ...it, section: null }))
      : c.sections.flatMap((s) =>
          s.rows.map((r) => ({
            id: `${c.id}-${r.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            name: r.name,
            info: r.info ?? null,
            section: s.title,
            price: r.prices.find((p) => p != null),
            variants: s.cols.length > 1 ? s.cols.map((col, i) => ({ name: col, price: r.prices[i] })).filter((v) => v.price != null) : undefined,
            tags: [],
          })),
        )

    for (const [ii, it] of rows.entries()) {
      const data = {
        name: it.name,
        description: it.desc ?? null,
        info: it.info ?? null,
        section: it.section ?? null,
        priceCents: cents(it.price),
        image: it.image ? `/images/food/${it.image}.webp` : null,
        options: it.options ?? undefined,
        tags: it.tags ?? [],
        sort: ii,
        categoryId: cat.id,
      }
      const saved = await prisma.menuItem.upsert({ where: { slug: it.id }, update: data, create: { slug: it.id, ...data } })
      await prisma.menuVariant.deleteMany({ where: { itemId: saved.id } })
      if (it.variants?.length) {
        await prisma.menuVariant.createMany({
          data: it.variants.map((v, vi) => ({ itemId: saved.id, name: v.name, priceCents: cents(v.price), sort: vi })),
        })
      }
      items++
    }
  }
  console.log(`Seeded ${Object.keys(settings).length} settings, ${menu.categories.length} categories, ${items} menu items`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
