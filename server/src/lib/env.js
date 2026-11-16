import 'dotenv/config'

const bool = (v) => v === 'true' || v === '1'

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4000),
  CLIENT_ORIGIN: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  MAIL_FROM: process.env.MAIL_FROM || 'BrewGrillz <hello@brewgrillz.sg>',
  RESTAURANT_EMAIL: process.env.RESTAURANT_EMAIL || 'info@brewgrillz.sg',
  WHATSAPP_ENABLED: bool(process.env.WHATSAPP_ENABLED),
  TRUST_PROXY: process.env.TRUST_PROXY ?? '1',
}

export const isProd = env.NODE_ENV === 'production'

export function warnMissing() {
  const missing = ['DATABASE_URL', 'JWT_SECRET', 'STRIPE_SECRET_KEY', 'RESEND_API_KEY'].filter((k) => !env[k])
  if (missing.length) console.warn(`[env] not set yet (fine for Sprint 0/1): ${missing.join(', ')}`)
}
