/*
  TEMPORARY staff endpoints (until the staff login + admin panel in Sprint 5).
  Protected by the x-staff-key header = STAFF_API_KEY. Lets us test status updates + refunds end to end.
*/
import { Router } from 'express'
import crypto from 'node:crypto'
import { z } from 'zod'
import { env } from '../lib/env.js'
import { stripe } from '../lib/integrations.js'
import { orders } from '../lib/orderStore.js'
import { notifyOrder } from '../lib/notify.js'

const r = Router()

r.use((req, res, next) => {
  const key = req.get('x-staff-key') || ''
  const ok = env.STAFF_API_KEY && key.length === env.STAFF_API_KEY.length && crypto.timingSafeEqual(Buffer.from(key), Buffer.from(env.STAFF_API_KEY))
  if (!ok) return res.status(401).json({ error: 'Unauthorised' })
  next()
})

// allowed next steps for a paid order
const NEXT = { PAID: ['ACCEPTED'], ACCEPTED: ['PREPARING'], PREPARING: ['READY'], READY: ['COMPLETED'] }
const stamp = (o, status) => [...(o.history || []), { status, at: new Date().toISOString() }]

r.get('/orders', async (req, res, next) => {
  try {
    res.json(await orders().list({ status: req.query.status }))
  } catch (e) {
    next(e)
  }
})

r.post('/orders/:id/status', async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(['ACCEPTED', 'PREPARING', 'READY', 'COMPLETED']) }).parse(req.body)
    const store = orders()
    const o = await store.findById(req.params.id)
    if (!o) return res.status(404).json({ error: 'Order not found' })
    if (!NEXT[o.status]?.includes(status)) return res.status(409).json({ error: `Can’t move an order from ${o.status} to ${status}` })
    const updated = await store.update(o.id, { status, history: stamp(o, status) })
    await notifyOrder(updated, status)
    res.json(updated)
  } catch (e) {
    next(e)
  }
})

// Full or partial refund. Full refund → order REFUNDED (customer notified).
r.post('/orders/:id/refund', async (req, res, next) => {
  try {
    const { amountCents } = z.object({ amountCents: z.number().int().positive().optional() }).parse(req.body || {})
    const store = orders()
    const o = await store.findById(req.params.id)
    if (!o) return res.status(404).json({ error: 'Order not found' })
    const pay = o.payments.find((p) => p.status === 'SUCCEEDED' || p.status === 'PARTIALLY_REFUNDED')
    if (!pay) {
      const done = o.payments.some((p) => p.status === 'REFUNDED')
      return res.status(409).json({ error: done ? 'This order has already been fully refunded' : 'This order has no successful payment to refund' })
    }
    const already = pay.refundedCents || 0
    const amount = amountCents ?? pay.amountCents - already
    if (amount <= 0 || already + amount > pay.amountCents) return res.status(400).json({ error: 'Refund amount is more than what’s left on this payment' })

    if (pay.provider === 'stripe') {
      const s = stripe()
      if (!s || !pay.paymentIntentId) return res.status(503).json({ error: 'Stripe is not configured' })
      await s.refunds.create({ payment_intent: pay.paymentIntentId, amount }, { idempotencyKey: `refund-${o.id}-${already + amount}` })
    }
    const refunded = already + amount
    const full = refunded >= pay.amountCents
    await store.updatePaymentByOrder(o.id, { refundedCents: refunded, status: full ? 'REFUNDED' : 'PARTIALLY_REFUNDED' })
    const updated = full ? await store.update(o.id, { status: 'REFUNDED', history: stamp(o, 'REFUNDED') }) : await store.findById(o.id)
    if (full) await notifyOrder(updated, 'REFUNDED')
    res.json({ ok: true, refundedCents: refunded, full })
  } catch (e) {
    next(e)
  }
})

export default r
