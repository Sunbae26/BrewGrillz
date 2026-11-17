import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import menu from '../data/menu.json'
import { ORDERING, orderableIndex } from '../data/ordering'

/*
  Cart (saved in this browser). Prices shown here are for display only —
  the server re-prices every line from the menu when the order is placed.
*/
const KEY = 'bgz-cart-v1'
const CartContext = createContext(null)
export const useCart = () => useContext(CartContext)
export const lineKey = (l) => [l.itemId, l.variant || '', JSON.stringify(l.options || {})].join('|')
const index = orderableIndex(menu)

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    // drop anything no longer on the menu, refresh names/prices from the current menu
    return raw
      .filter((l) => index.has(l.itemId))
      .map((l) => {
        const it = index.get(l.itemId)
        const v = it.variants?.find((x) => x.name === l.variant)
        return { ...l, name: it.name, image: it.image || null, unitPrice: v ? v.price : it.price }
      })
  } catch {
    return []
  }
}

export default function CartProvider({ children }) {
  const [lines, setLines] = useState([])
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setLines(load())
    setReady(true)
  }, [])
  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(KEY, JSON.stringify(lines))
    } catch {
      /* private mode */
    }
  }, [lines, ready])

  const add = useCallback((line) => {
    setLines((cur) => {
      const k = lineKey(line)
      const found = cur.find((l) => lineKey(l) === k)
      if (found) return cur.map((l) => (l === found ? { ...l, qty: Math.min(ORDERING.maxQtyPerLine, l.qty + line.qty) } : l))
      return [...cur, line]
    })
  }, [])
  const setQty = useCallback((key, qty) => {
    setLines((cur) => (qty <= 0 ? cur.filter((l) => lineKey(l) !== key) : cur.map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(ORDERING.maxQtyPerLine, qty) } : l))))
  }, [])
  const clear = useCallback(() => setLines([]), [])

  const value = useMemo(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0)
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0)
    return { lines, ready, count, subtotal, add, setQty, clear, open, setOpen }
  }, [lines, ready, add, setQty, clear, open])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
