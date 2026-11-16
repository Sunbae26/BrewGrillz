import { Router } from 'express'
import { z } from 'zod'
import { prisma, hasDb } from '../lib/prisma.js'

const r = Router()
const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  source: z.string().max(40).optional(),
})

// POST /api/newsletter  { email, source }
r.post('/', async (req, res) => {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Please enter a valid email.' })
  if (!hasDb()) return res.status(503).json({ error: 'Signup is not available yet.' })
  try {
    await prisma.newsletterSub.upsert({
      where: { email: parsed.data.email },
      update: {},
      create: parsed.data,
    })
    res.status(201).json({ ok: true })
  } catch (e) {
    console.error('[newsletter]', e.message)
    res.status(500).json({ error: 'Could not sign you up right now.' })
  }
})

export default r
