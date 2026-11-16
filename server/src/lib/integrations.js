import Stripe from 'stripe'
import { Resend } from 'resend'
import { env } from './env.js'

// Created lazily so the API boots without keys during Sprint 0/1.
let _stripe, _resend
export const stripe = () => (env.STRIPE_SECRET_KEY ? (_stripe ||= new Stripe(env.STRIPE_SECRET_KEY)) : null)
export const resend = () => (env.RESEND_API_KEY ? (_resend ||= new Resend(env.RESEND_API_KEY)) : null)

/** Send an email if Resend is configured; otherwise log it (dev). */
export async function sendMail({ to, subject, html }) {
  const client = resend()
  if (!client) {
    console.log(`[mail:dev] to=${to} subject="${subject}"`)
    return { skipped: true }
  }
  return client.emails.send({ from: env.MAIL_FROM, to, subject, html })
}
