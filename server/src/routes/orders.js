import { Router } from 'express'
import { z } from 'zod'
import { env, isProd } from '../lib/env.js'
import { stripe } from '../lib/integrations.js'
import { priceCart, CartError } from '../lib/pricing.js'
import { orders, newToken } from '../lib/orderStore.js'
import { notifyOrder } from '../lib/notify.js'
import { isValidPickup } from '../../../client/src/data/ordering.js'

const r = Router()

const phoneRe = /^(\+?65)?[689]\d{7}$/
const body = z.object({
  items: z.array(z.object({
    itemId: z.string().max(80),
    qty: z.number().int(),
    variant: z.string().max(60).nullable().optional(),
    options: z.record(z.string().max(40), z.string().max(60)).optional(),
    notes: z.string().max(140).optional(),
  })).min(1, 'Your cart is empty.').max(60, 'That cart is a bit too big — please call us for large orders.'),
  customer: z.object({
    name: z.string().trim().min(2, 'Please enter your name.').max(80),
    email: z.string().trim().toLowerCase().email('Please enter a valid email.').max(160),
    phone: z.string().transform((s) => s.replace(/[\s-]/g, '')).refine((s) => phoneRe.test(s), 'Please enter a Singapore mobile number (8 digits).'),
  }),
  pickupAt: z.string().max(40),
  notes: z.string().max(300).optional(),
  agree: z.literal(true, { errorMap: () => ({ message: 'Please accept the terms to continue.' }) }),
})

const stamp = (o, status) => [...(o.history || []), { status, at: new Date().toISOString() }]

/** Mark an order as paid exactly once (webhook + success page can both arrive). */
export async function markPaid(order, payment = {}) {
  const store = orders()
  if (order.status !== 'PENDING_PAYMENT') return order
  const updated = await store.update(order.id, { status: 'PAID', history: stamp(order, 'PAID') })
  if (payment.checkoutSessionId) await store.updatePayment(payment.checkoutSessionId, { status: 'SUCCEEDED', paymentIntentId: payment.paymentIntentId ?? null })
  await notifyOrder(updated, 'PAID')
  return updated
}

// POST /api/orders → creates a pending order and returns where to send the customer to pay
r.post('/', async (req, res, next) => {
  try {
    const parsed = body.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message, field: parsed.error.issues[0].path.join('.') })
    const { items, customer, pickupAt, notes } = parsed.data
    if (!isValidPickup(pickupAt)) return res.status(400).json({ error: 'That pickup time is no longer available — please pick another.', field: 'pickupAt' })

    const cart = priceCart(items)
    const store = orders()
    const phone = `+65${customer.phone.replace(/^\+?65/, '')}`
    const order = await store.create({
      trackingToken: newToken(),
      status: 'PENDING_PAYMENT',
      history: [{ status: 'PENDING_PAYMENT', at: new Date().toISOString() }],
      fulfilment: 'PICKUP',
      scheduledFor: new Date(pickupAt),
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: phone,
      notes: notes?.trim() || null,
      subtotalCents: cart.subtotalCents,
      totalCents: cart.subtotalCents, // pickup: no delivery fee, no service charge; prices already include GST
      items: cart.lines.map((l) => ({ itemSlug: l.itemId, name: l.name, variant: l.variant, modifiers: l.options, qty: l.qty, unitCents: l.unitCents, notes: l.notes || null })),
    })
    const trackPath = `/track/${order.trackingToken}`

    const s = stripe()
    if (s) {
      const session = await s.checkout.sessions.create(
        {
          mode: 'payment',
          currency: 'sgd',
          // no payment_method_types → Stripe shows what's enabled in the dashboard (cards, PayNow, Apple/Google Pay)
          line_items: cart.lines.map((l) => ({
            quantity: l.qty,
            price_data: {
              currency: 'sgd',
              unit_amount: l.unitCents,
              product_data: {
                name: l.variant ? `${l.name} (${l.variant})` : l.name,
                ...(Object.keys(l.options).length ? { description: Object.values(l.options).join(' · ') } : {}),
              },
            },
          })),
          customer_email: customer.email,
          client_reference_id: order.id,
          metadata: { orderId: order.id, orderNumber: String(order.number) },
          payment_intent_data: { metadata: { orderId: order.id, orderNumber: String(order.number) } },
          success_url: `${env.PUBLIC_SITE_URL}${trackPath}?paid=1`,
          cancel_url: `${env.PUBLIC_SITE_URL}/order?cancelled=1`,
          expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        },
        { idempotencyKey: `order-${order.id}` },
      )
      await store.addPayment({ orderId: order.id, provider: 'stripe', checkoutSessionId: session.id, amountCents: order.totalCents, status: 'PENDING' })
      return res.status(201).json({ url: session.url, token: order.trackingToken, number: order.number })
    }

    if (!isProd && env.DEV_FAKE_PAYMENTS) {
      // Local testing without Stripe: pretend the payment went through.
      await store.addPayment({ orderId: order.id, provider: 'dev', checkoutSessionId: `dev_${order.id}`, amountCents: order.totalCents, status: 'PENDING' })
      await markPaid(order, { checkoutSessionId: `dev_${order.id}` })
      return res.status(201).json({ url: `${trackPath}?paid=1`, token: order.trackingToken, number: order.number, dev: true })
    }

    await store.update(order.id, { status: 'CANCELLED', history: stamp(order, 'CANCELLED') })
    return res.status(503).json({ error: 'Online payment isn’t switched on yet. Please call us on +65 6312 2847 to order.' })
  } catch (e) {
    if (e instanceof CartError) return res.status(400).json({ error: e.message, field: 'items' })
    next(e)
  }
})

// GET /api/orders/track/:token → public order status for the tracking page (no personal details)
r.get('/track/:token', async (req, res, next) => {
  try {
    if (!/^[\w-]{10,64}$/.test(req.params.token)) return res.status(404).json({ error: 'Order not found' })
    const o = await orders().findByToken(req.params.token)
    if (!o) return res.status(404).json({ error: 'Order not found' })
    res.set('Cache-Control', 'no-store')
    res.json({
      number: o.number,
      status: o.status,
      history: o.history || [],
      pickupAt: o.scheduledFor,
      createdAt: o.createdAt,
      firstName: o.customerName.split(' ')[0],
      totalCents: o.totalCents,
      items: o.items.map((i) => ({ name: i.name, qty: i.qty, variant: i.variant, options: i.modifiers, unitCents: i.unitCents })),
    })
  } catch (e) {
    next(e)
  }
})

export default r
