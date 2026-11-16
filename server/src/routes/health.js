import { Router } from 'express'
import { prisma, hasDb } from '../lib/prisma.js'
import { env } from '../lib/env.js'

const r = Router()

r.get('/', async (_req, res) => {
  let db = 'not-configured'
  if (hasDb()) {
    try {
      await prisma.$queryRaw`SELECT 1`
      db = 'ok'
    } catch {
      db = 'error'
    }
  }
  res.json({
    ok: true,
    service: 'brewgrillz-api',
    env: env.NODE_ENV,
    db,
    stripe: Boolean(env.STRIPE_SECRET_KEY),
    email: Boolean(env.RESEND_API_KEY),
    time: new Date().toISOString(),
  })
})

export default r
