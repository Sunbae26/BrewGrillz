import { PrismaClient } from '@prisma/client'
import { env } from './env.js'

// Created on first use, so the API still boots (health, static routes) before a DB is configured.
// One client per process (avoids exhausting Neon connections in --watch mode).
const g = globalThis
function client() {
  if (!g.__prisma) {
    g.__prisma = new PrismaClient({ log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'] })
  }
  return g.__prisma
}

export const prisma = new Proxy({}, { get: (_t, prop) => client()[prop] })

// the .env.example placeholder counts as "no database", so local testing works before Neon is set up
export const hasDb = () => Boolean(env.DATABASE_URL) && !/USER:PASSWORD|ep-xxxx/.test(env.DATABASE_URL)
