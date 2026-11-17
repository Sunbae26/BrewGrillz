// Server-side cart pricing. The browser's prices are NEVER trusted — every line is re-priced from menu.json.
import { loadMenuJson } from './menuData.js'
import { ORDERING, orderableIndex } from '../../../client/src/data/ordering.js'

let index = null
export const menuIndex = () => (index ||= orderableIndex(loadMenuJson()))
export const toCents = (n) => Math.round(n * 100)

export class CartError extends Error {
  constructor(message) {
    super(message)
    this.status = 400
  }
}

/**
 * lines: [{ itemId, qty, variant?, options?: { [name]: choice }, notes? }]
 * returns { lines: [{ itemId, name, variant, options, qty, unitCents, notes }], subtotalCents }
 */
export function priceCart(lines) {
  if (!Array.isArray(lines) || lines.length === 0) throw new CartError('Your cart is empty.')
  if (lines.length > 60) throw new CartError('That cart is a bit too big — please call us for large orders.')
  const idx = menuIndex()
  const out = lines.map((l) => {
    const item = idx.get(l.itemId)
    if (!item && /^(beer|cocktails|wine|spirits)-/.test(String(l.itemId))) throw new CartError('Alcoholic drinks are dine-in only — please remove them from your cart.')
    if (!item) throw new CartError('An item in your cart is no longer available. Please remove it and try again.')
    if (item.available === false) throw new CartError(`${item.name} is sold out today.`)
    const qty = Number(l.qty)
    if (!Number.isInteger(qty) || qty < 1 || qty > ORDERING.maxQtyPerLine) throw new CartError(`Please check the quantity for ${item.name}.`)

    let unit = item.price
    let variant = null
    if (item.variants?.length) {
      const v = item.variants.find((x) => x.name === l.variant)
      if (!v) throw new CartError(`Please choose a size for ${item.name}.`)
      unit = v.price
      variant = v.name
    }

    const options = {}
    for (const o of item.options || []) {
      const picked = l.options?.[o.name]
      if (!o.choices.includes(picked)) throw new CartError(`Please choose ${o.name.toLowerCase()} for ${item.name}.`)
      options[o.name] = picked
    }

    const notes = typeof l.notes === 'string' ? l.notes.trim().slice(0, 140) : ''
    return { itemId: item.id, name: item.name, variant, options, qty, unitCents: toCents(unit), notes }
  })
  const subtotalCents = out.reduce((s, l) => s + l.unitCents * l.qty, 0)
  return { lines: out, subtotalCents }
}
