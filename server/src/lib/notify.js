// Customer + restaurant notifications. Every send is best-effort: a failed email never breaks an order.
import { env } from './env.js'
import { sendMail } from './integrations.js'
import { formatPickup } from '../../../client/src/data/ordering.js'

const money = (c) => `$${(c / 100).toFixed(2)}`
const esc = (s = '') => String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m])
export const trackUrl = (o) => `${env.PUBLIC_SITE_URL}/track/${o.trackingToken}`

const STATUS_COPY = {
  PAID: ['Order received', 'Thanks! We’ve got your order and payment.'],
  ACCEPTED: ['Order accepted', 'The kitchen has accepted your order.'],
  PREPARING: ['On the grill', 'Your food is being prepared right now.'],
  READY: ['Ready for pickup', 'Your order is ready. See you at 163 Rochor Road!'],
  COMPLETED: ['Collected', 'Enjoy your meal — thanks for choosing BrewGrillz!'],
  CANCELLED: ['Order cancelled', 'Your order has been cancelled.'],
  REFUNDED: ['Refund issued', 'Your refund is on its way. It can take 5–10 business days to appear.'],
}

function itemsTable(o) {
  const rows = o.items
    .map((i) => {
      const extras = [i.variant, ...Object.values(i.modifiers || {}), i.notes && `“${i.notes}”`].filter(Boolean).join(' · ')
      return `<tr><td style="padding:6px 0">${i.qty} × ${esc(i.name)}${extras ? `<br><span style="color:#888;font-size:13px">${esc(extras)}</span>` : ''}</td><td style="padding:6px 0;text-align:right;white-space:nowrap">${money(i.unitCents * i.qty)}</td></tr>`
    })
    .join('')
  return `<table width="100%" style="border-collapse:collapse;font-size:15px">${rows}<tr><td style="padding-top:10px;border-top:1px solid #ddd"><b>Total</b> <span style="color:#888;font-size:12px">(incl. GST)</span></td><td style="padding-top:10px;border-top:1px solid #ddd;text-align:right"><b>${money(o.totalCents)}</b></td></tr></table>`
}

const shell = (title, body) => `<!doctype html><html><body style="margin:0;background:#f4efe8;font-family:Helvetica,Arial,sans-serif;color:#1a1514">
<div style="max-width:560px;margin:0 auto;padding:28px 18px">
<div style="background:#141110;color:#f5efe6;padding:22px 24px;border-radius:14px 14px 0 0"><b style="font-size:22px;letter-spacing:1px">BREW<span style="color:#da3833">GRILLZ</span></b><div style="font-size:12px;opacity:.7;margin-top:4px">Finest Grill Dining &amp; Bar · 163 Rochor Road</div></div>
<div style="background:#fff;padding:26px 24px;border-radius:0 0 14px 14px"><h1 style="margin:0 0 14px;font-size:22px">${esc(title)}</h1>${body}</div>
<p style="font-size:12px;color:#888;text-align:center;margin-top:16px">163 Rochor Road, Bugis Street, Singapore 188438 · +65 6312 2847 · WhatsApp +65 8770 2077</p>
</div></body></html>`

function customerEmail(o, status) {
  const [title, line] = STATUS_COPY[status]
  const showItems = status === 'PAID'
  return shell(
    `${title} · #${o.number}`,
    `<p style="margin:0 0 16px">${esc(line)}</p>
     <p style="margin:0 0 6px"><b>Pickup:</b> ${esc(formatPickup(o.scheduledFor))}</p>
     <p style="margin:0 0 18px"><b>Where:</b> 163 Rochor Road, Bugis Street, S188438</p>
     ${showItems ? itemsTable(o) : ''}
     <p style="margin:22px 0 0"><a href="${trackUrl(o)}" style="background:#da3833;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Track your order</a></p>`,
  )
}

function restaurantEmail(o) {
  return shell(
    `New pickup order #${o.number}`,
    `<p style="margin:0 0 6px"><b>Pickup:</b> ${esc(formatPickup(o.scheduledFor))}</p>
     <p style="margin:0 0 6px"><b>Customer:</b> ${esc(o.customerName)} · ${esc(o.customerPhone)} · ${esc(o.customerEmail)}</p>
     ${o.notes ? `<p style="margin:0 0 6px"><b>Notes:</b> ${esc(o.notes)}</p>` : ''}
     <div style="margin-top:16px">${itemsTable(o)}</div>`,
  )
}

// ---------- WhatsApp (Meta WhatsApp Cloud API, approved templates — same approach as Ruchi) ----------
export async function sendWhatsApp(to, template, params = []) {
  if (!env.WHATSAPP_ENABLED || !env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_ID) {
    console.log(`[whatsapp:dev] to=${to} template=${template} params=${JSON.stringify(params)}`)
    return { skipped: true }
  }
  const res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to.replace(/\D/g, ''),
      type: 'template',
      template: { name: template, language: { code: 'en' }, components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: String(text) })) }] },
    }),
  })
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${await res.text()}`)
  return res.json()
}

// Template names (create + get these approved in Meta Business Manager)
const WA = { PAID: 'bgz_order_received', READY: 'bgz_order_ready', REFUNDED: 'bgz_order_refunded' }

const safe = async (label, fn) => {
  try {
    await fn()
  } catch (e) {
    console.error(`[notify] ${label} failed:`, e.message)
  }
}

/** Called after payment succeeds and on every staff status change. */
export async function notifyOrder(o, status) {
  if (!STATUS_COPY[status]) return
  const [title] = STATUS_COPY[status]
  // customer email on the moments that matter (not on every small step)
  if (['PAID', 'READY', 'CANCELLED', 'REFUNDED'].includes(status)) {
    await safe('customer email', () => sendMail({ to: o.customerEmail, subject: `${title} · BrewGrillz #${o.number}`, html: customerEmail(o, status) }))
  }
  if (status === 'PAID') {
    await safe('restaurant email', () => sendMail({ to: env.RESTAURANT_EMAIL, subject: `🔥 New pickup order #${o.number} · ${formatPickup(o.scheduledFor)}`, html: restaurantEmail(o) }))
  }
  if (WA[status]) {
    await safe('whatsapp', () => sendWhatsApp(o.customerPhone, WA[status], [o.customerName.split(' ')[0], `#${o.number}`, formatPickup(o.scheduledFor), trackUrl(o)]))
  }
}
