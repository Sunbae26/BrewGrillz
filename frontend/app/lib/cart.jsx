import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useMenu } from "./queries.js";

/*
  Cart, saved in this browser. Prices here are for display only:
  the server prices every line again from the database when the order is placed.
*/
const KEY = "bgz-cart-v2";
export const MAX_QTY = 20;
const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);
export const lineKey = (l) => [l.slug, l.variant || "", JSON.stringify(l.options || {})].join("|");
export const lineExtras = (l) => [l.variant, ...Object.values(l.options || {})].filter(Boolean).join(" · ");

// Everything that can be ordered online, by slug: dishes, plus drinks from orderable categories.
export function orderableIndex(menu) {
  const index = new Map();
  for (const c of menu?.categories ?? []) {
    for (const item of c.items ?? []) index.set(item.id, item);
    if (c.orderable && c.sections)
      for (const s of c.sections)
        for (const row of s.rows) index.set(row.id, { ...row, price: row.prices.find((p) => p != null) });
  }
  return index;
}

function readSaved() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((l) => l && typeof l.slug === "string" && l.qty > 0) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [lines, setLines] = useState([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  // only fetch the menu for the cart when there's something in it
  const { data: menu } = useMenu(undefined, { enabled: ready && lines.length > 0 });

  useEffect(() => {
    setLines(readSaved());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* private mode */
    }
  }, [lines, ready]);

  // keep names and prices in step with the live menu; drop things no longer on it
  useEffect(() => {
    if (!menu) return;
    const index = orderableIndex(menu);
    setLines((cur) => {
      const next = cur
        .filter((l) => index.has(l.slug))
        .map((l) => {
          const item = index.get(l.slug);
          const variant = item.variants?.find((v) => v.name === l.variant);
          return { ...l, name: item.name, image: item.image ?? null, unitPrice: variant ? variant.price : item.price, available: item.available !== false };
        });
      return JSON.stringify(next) === JSON.stringify(cur) ? cur : next;
    });
  }, [menu]);

  const add = useCallback((line) => {
    setLines((cur) => {
      const k = lineKey(line);
      const found = cur.find((l) => lineKey(l) === k);
      if (found) return cur.map((l) => (l === found ? { ...l, qty: Math.min(MAX_QTY, l.qty + line.qty) } : l));
      return [...cur, line];
    });
  }, []);
  const setQty = useCallback((key, qty) => {
    setLines((cur) =>
      qty <= 0 ? cur.filter((l) => lineKey(l) !== key) : cur.map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)),
    );
  }, []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = Math.round(lines.reduce((s, l) => s + l.unitPrice * l.qty, 0) * 100) / 100;
    const soldOut = lines.filter((l) => l.available === false);
    return { lines, ready, count, subtotal, soldOut, add, setQty, clear, open, setOpen };
  }, [lines, ready, add, setQty, clear, open]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
