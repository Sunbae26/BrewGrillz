/*
  Order storage with one interface and two back ends:
  - Prisma (Neon)  → used whenever DATABASE_URL is set (always in production)
  - JSON file      → dev only, when no database is configured yet, so the whole
                     order flow can be tested locally. Lives in server/.dev-data/.
*/
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { prisma, hasDb } from './prisma.js'
import { isProd } from './env.js'

export const newToken = () => crypto.randomBytes(18).toString('base64url')

// ---------------- Prisma ----------------
const include = { items: true, payments: true }
const prismaStore = {
  kind: 'db',
  async create({ items, ...order }) {
    return prisma.order.create({ data: { ...order, items: { create: items } }, include })
  },
  findById: (id) => prisma.order.findUnique({ where: { id }, include }),
  findByToken: (trackingToken) => prisma.order.findUnique({ where: { trackingToken }, include }),
  async findBySession(checkoutSessionId) {
    const p = await prisma.payment.findUnique({ where: { checkoutSessionId } })
    return p?.orderId ? prismaStore.findById(p.orderId) : null
  },
  update: (id, data) => prisma.order.update({ where: { id }, data, include }),
  addPayment: (data) => prisma.payment.create({ data }),
  updatePayment: (checkoutSessionId, data) => prisma.payment.update({ where: { checkoutSessionId }, data }),
  updatePaymentByOrder: (orderId, data) => prisma.payment.updateMany({ where: { orderId }, data }),
  list: ({ status, take = 100 } = {}) =>
    prisma.order.findMany({ where: status ? { status } : {}, orderBy: { createdAt: 'desc' }, take, include }),
}

// ---------------- JSON file (dev) ----------------
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.dev-data')
const FILE = path.join(DIR, 'orders.json')
const read = () => {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'))
  } catch {
    return { seq: 1000, orders: [] }
  }
}
const write = (db) => {
  fs.mkdirSync(DIR, { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2))
}
const fileStore = {
  kind: 'file',
  async create({ items, ...order }) {
    const db = read()
    const now = new Date().toISOString()
    const o = { id: crypto.randomUUID(), number: ++db.seq, createdAt: now, updatedAt: now, payments: [], ...order, items: items.map((i) => ({ id: crypto.randomUUID(), ...i })) }
    db.orders.push(o)
    write(db)
    return o
  },
  findById: async (id) => read().orders.find((o) => o.id === id) || null,
  findByToken: async (t) => read().orders.find((o) => o.trackingToken === t) || null,
  findBySession: async (sid) => read().orders.find((o) => o.payments.some((p) => p.checkoutSessionId === sid)) || null,
  async update(id, data) {
    const db = read()
    const o = db.orders.find((x) => x.id === id)
    Object.assign(o, data, { updatedAt: new Date().toISOString() })
    write(db)
    return o
  },
  async addPayment({ orderId, ...p }) {
    const db = read()
    db.orders.find((o) => o.id === orderId).payments.push({ id: crypto.randomUUID(), orderId, refundedCents: 0, ...p })
    write(db)
  },
  async updatePayment(sid, data) {
    const db = read()
    for (const o of db.orders) for (const p of o.payments) if (p.checkoutSessionId === sid) Object.assign(p, data)
    write(db)
  },
  async updatePaymentByOrder(orderId, data) {
    const db = read()
    for (const p of db.orders.find((o) => o.id === orderId)?.payments || []) Object.assign(p, data)
    write(db)
  },
  list: async ({ status, take = 100 } = {}) =>
    read()
      .orders.filter((o) => !status || o.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, take),
}

export function orders() {
  if (hasDb()) return prismaStore
  if (isProd) throw Object.assign(new Error('DATABASE_URL is required in production'), { status: 503 })
  return fileStore
}
