// POST /api/webhooks/stripe — mounted with express.raw() BEFORE express.json() so the signature can be checked.
import { env } from '../lib/env.js'
import { stripe } from '../lib/integrations.js'
import { orders } from '../lib/orderStore.js'
import { markPaid } from './orders.js'

export default async function stripeWebhook(req, res) {
  const s = stripe()
  if (!s || !env.STRIPE_WEBHOOK_SECRET) return res.status(503).send('Stripe not configured')

  let event
  try {
    event = s.webhooks.constructEvent(req.body, req.headers['stripe-signature'], env.STRIPE_WEBHOOK_SECRET)
  } catch (e) {
    console.warn('[stripe] bad signature:', e.message)
    return res.status(400).send('Bad signature')
  }

  try {
    const session = event.data.object
    const store = orders()
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        // PayNow can complete "unpaid" first and succeed a moment later (async_payment_succeeded)
        if (session.payment_status !== 'paid') break
        const order = await store.findBySession(session.id)
        if (order) await markPaid(order, { checkoutSessionId: session.id, paymentIntentId: session.payment_intent })
        break
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const order = await store.findBySession(session.id)
        if (order?.status === 'PENDING_PAYMENT') {
          await store.update(order.id, { status: 'CANCELLED', history: [...(order.history || []), { status: 'CANCELLED', at: new Date().toISOString() }] })
          await store.updatePayment(session.id, { status: 'FAILED' })
        }
        break
      }
      default:
        break
    }
    res.json({ received: true })
  } catch (e) {
    console.error('[stripe] webhook handling failed:', e)
    res.status(500).send('Webhook error') // Stripe retries automatically
  }
}
