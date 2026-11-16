import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { env, isProd } from './lib/env.js'
import health from './routes/health.js'
import newsletter from './routes/newsletter.js'
import menu from './routes/menu.js'

export function createApp() {
  const app = express()
  app.set('trust proxy', env.TRUST_PROXY === 'false' ? false : Number(env.TRUST_PROXY) || 1)
  app.disable('x-powered-by')

  app.use(helmet())
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }))
  app.use(morgan(isProd ? 'combined' : 'dev'))

  // Stripe webhooks need the RAW body — mount them BEFORE express.json() (Sprint 3):
  // app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook)

  app.use(express.json({ limit: '200kb' }))

  const formLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false })

  app.use('/api/health', health)
  app.use('/api/newsletter', formLimiter, newsletter)
  app.use('/api/menu', menu)
  // Sprint 3: app.use('/api/orders', orders)
  // Sprint 4: app.use('/api/reservations', reservations); app.use('/api/contact', contact)
  // Sprint 5: app.use('/api/auth', auth); app.use('/api/loyalty', loyalty); app.use('/api/admin', admin)

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error('[error]', err)
    res.status(err.status || 500).json({ error: isProd ? 'Something went wrong' : err.message })
  })

  return app
}
