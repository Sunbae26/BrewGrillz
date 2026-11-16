import { Router } from 'express'
import { prisma, hasDb } from '../lib/prisma.js'
import { loadMenuJson } from '../lib/menuData.js'

const r = Router()
const price = (c) => (c == null ? null : c / 100)

// GET /api/menu — whole menu from the database; falls back to menu.json if no DB is configured yet.
r.get('/', async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  if (!hasDb()) return res.json({ ...loadMenuJson(), source: 'file' })
  try {
    const cats = await prisma.menuCategory.findMany({
      orderBy: { sort: 'asc' },
      include: { items: { orderBy: { sort: 'asc' }, include: { variants: { orderBy: { sort: 'asc' } } } } },
    })
    res.json({
      source: 'db',
      categories: cats.map((c) => ({
        id: c.slug,
        name: c.name,
        group: c.type === 'DRINK' ? 'drinks' : 'food',
        note: c.note,
        items: c.items.map((i) => ({
          id: i.slug,
          name: i.name,
          desc: i.description,
          info: i.info,
          section: i.section,
          price: price(i.priceCents),
          image: i.image,
          tags: i.tags,
          options: i.options,
          available: i.isAvailable,
          orderable: i.isOrderable,
          variants: i.variants.map((v) => ({ name: v.name, price: price(v.priceCents) })),
        })),
      })),
    })
  } catch (e) {
    console.error('[menu]', e.message)
    res.json({ ...loadMenuJson(), source: 'file' }) // never leave the menu blank
  }
})

// GET /api/menu/:slug — one item
r.get('/:slug', async (req, res) => {
  if (!hasDb()) {
    const all = loadMenuJson().categories.flatMap((c) => c.items || [])
    const it = all.find((i) => i.id === req.params.slug)
    return it ? res.json(it) : res.status(404).json({ error: 'Not found' })
  }
  const it = await prisma.menuItem.findUnique({ where: { slug: req.params.slug }, include: { variants: true } })
  return it ? res.json(it) : res.status(404).json({ error: 'Not found' })
})

export default r
