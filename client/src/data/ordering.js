// Ordering rules shared by the website AND the API (the server imports this file too).
// Pickup only. Alcohol is dine-in only.

export const ORDERING = {
  timeZone: 'Asia/Singapore',
  kitchenOpen: '11:30', // first pickup slot
  kitchenClose: '22:30', // last pickup slot
  slotMinutes: 15,
  leadMinutes: 30, // earliest pickup = now + 30 min
  daysAhead: 6, // today + 6 days
  maxQtyPerLine: 20,
  // drinks categories that CAN be ordered for pickup (the rest of the drinks menu is dine-in only)
  orderableDrinkCategories: ['softdrinks', 'coffee'],
  // closed dates (YYYY-MM-DD) — moves to the admin settings in Sprint 5
  closedDates: [],
}

export const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

/** Flatten menu.json into orderable items: { id, name, price, variants, options, image, category } */
export function orderableIndex(menu) {
  const out = new Map()
  for (const c of menu.categories) {
    if (c.group === 'food') {
      for (const it of c.items) out.set(it.id, { ...it, category: c.id })
    } else if (ORDERING.orderableDrinkCategories.includes(c.id)) {
      for (const s of c.sections) {
        for (const r of s.rows) {
          const id = `${c.id}-${slugify(r.name)}`
          out.set(id, { id, name: r.name, info: r.info, price: r.prices[0], category: c.id })
        }
      }
    }
  }
  return out
}
export const drinkRowId = (catId, name) => `${catId}-${slugify(name)}`

// ---------- pickup slots (computed in Singapore time, wherever the browser/server is) ----------
const pad = (n) => String(n).padStart(2, '0')
const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
/** Current date/time in Singapore as { date: 'YYYY-MM-DD', minutes } */
export function sgNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: ORDERING.timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  )
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) }
}
const addDays = (ymd, n) => {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
/** ISO string for a Singapore wall-clock time (SGT is UTC+8, no DST) */
export const sgIso = (ymd, minutes) => `${ymd}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00+08:00`

/** [{ date, label, slots: [{ iso, label }] }] — only days with at least one slot */
export function pickupDays(now = new Date()) {
  const { date: today, minutes: nowMin } = sgNow(now)
  const open = toMin(ORDERING.kitchenOpen)
  const close = toMin(ORDERING.kitchenClose)
  const days = []
  for (let d = 0; d <= ORDERING.daysAhead; d++) {
    const ymd = addDays(today, d)
    if (ORDERING.closedDates.includes(ymd)) continue
    let start = open
    if (d === 0) {
      const earliest = nowMin + ORDERING.leadMinutes
      start = Math.max(open, Math.ceil(earliest / ORDERING.slotMinutes) * ORDERING.slotMinutes)
    }
    const slots = []
    for (let m = start; m <= close; m += ORDERING.slotMinutes) {
      const h = Math.floor(m / 60)
      slots.push({ iso: sgIso(ymd, m), label: `${((h + 11) % 12) + 1}:${pad(m % 60)} ${h < 12 ? 'am' : 'pm'}` })
    }
    if (!slots.length) continue
    const dateObj = new Date(`${ymd}T12:00:00+08:00`)
    const label =
      d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : new Intl.DateTimeFormat('en-SG', { timeZone: ORDERING.timeZone, weekday: 'short', day: 'numeric', month: 'short' }).format(dateObj)
    days.push({ date: ymd, label, slots })
  }
  return days
}

/** true if iso is one of the currently valid pickup slots */
export function isValidPickup(iso, now = new Date()) {
  return pickupDays(now).some((d) => d.slots.some((s) => s.iso === iso))
}

export const formatPickup = (iso) =>
  new Intl.DateTimeFormat('en-SG', { timeZone: ORDERING.timeZone, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
