import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { Button, Sticker, Flame, Arrow } from '../components/ui/ui'
import { gsap, prefersReducedMotion } from '../motion/gsap'
import { useLenis } from '../motion/SmoothScroll'
import { useCart, MAX_QTY } from '../lib/cart.jsx'
import { loadOrNull, useMenu } from '../lib/queries.js'
import QtyStepper from '../components/ui/QtyStepper'
import DeliveryLinks from '../components/ui/DeliveryLinks'
import { seo } from "../lib/seo.js";

/*
  THE MENU — every dish and drink, from the database through the API.
  Built into the page at build time (fast first paint, good for Google), then refreshed live.
  Food: photo cards with filters + search, tap a card for the details.
  Drinks: menu-board layout.  ?table → view-only mode for table QR codes.
*/
const FILTERS = [
  { id: 'chefs-choice', label: 'Chef’s choice' },
  { id: 'signature', label: 'Signature' },
  { id: 'spicy', label: 'Spicy' },
  { id: 'veg', label: 'Vegetarian' },
  { id: 'sharing', label: 'Sharing' },
]
const TAG_LABEL = { 'chefs-choice': 'Chef’s choice', signature: 'Signature', spicy: 'Spicy', veg: 'Veg', sharing: 'Share it' }
const TAG_TONE = { 'chefs-choice': 'red', signature: 'cream', spicy: 'red', veg: 'lime', sharing: 'cream' }

const fmt = (n) => (n == null ? '' : `$${Number.isInteger(n) ? n : n.toFixed(1)}`)
const img = (name) => ({ xs: `/images/food/${name}-xs.webp`, sm: `/images/food/${name}-sm.webp`, src: `/images/food/${name}.webp` })

export async function loader() {
  return { menu: await loadOrNull('/menu') }
}

export const meta = () =>
  seo({
    title: "Menu | BrewGrillz Singapore — Steaks, Pizza, Pasta & Craft Beer in Bugis",
    description: "The full BrewGrillz menu: flame-grilled steaks, BBQ ribs, sharing platters, pizza, pasta, burgers, Brewerkz craft beer and cocktails. Order online for pickup at 163 Rochor Road, Bugis.",
    path: "/menu",
  });

/* ---------- dish card ---------- */
function DishCard({ item, onOpen, tableMode }) {
  const pic = item.image && img(item.image)
  const from = item.variants?.length ? Math.min(...item.variants.map((v) => v.price)) : item.price
  return (
    <button type="button" className="dish" onClick={() => onOpen(item)} data-cursor-label="Details">
      <div className={`dish__media ${pic ? '' : 'dish__media--empty'}`}>
        {pic ? (
          <img src={pic.xs} srcSet={`${pic.xs} 520w, ${pic.sm} 900w`} sizes="(max-width: 640px) 92vw, (max-width: 1100px) 45vw, 30vw" alt={item.name} loading="lazy" decoding="async" />
        ) : (
          <span className="dish__placeholder" aria-hidden="true">
            <Flame />
            <span className="western">BrewGrillz</span>
          </span>
        )}
        {item.available === false ? <Sticker tone="cream" rotate={-5} className="dish__sticker">Sold out</Sticker> : item.tags?.[0] && <Sticker tone={TAG_TONE[item.tags[0]]} rotate={-5} className="dish__sticker">{TAG_LABEL[item.tags[0]]}</Sticker>}
      </div>
      <div className="dish__body">
        <div className="dish__top">
          <h3 className="dish__name">{item.name}</h3>
          <span className="dish__price">{item.variants?.length ? <small>from </small> : null}{fmt(from)}</span>
        </div>
        <p className="dish__desc">{item.desc}</p>
        <div className="dish__foot">
          <span className="dish__tags">{item.tags?.slice(1).map((t) => <span key={t} className={`tag tag--${t}`}>{TAG_LABEL[t]}</span>)}</span>
          <span className="dish__more">{tableMode ? 'View' : 'Details'} <Arrow /></span>
        </div>
      </div>
    </button>
  )
}

/* ---------- details modal ---------- */
function DishModal({ item, notes: menuNotes, onClose, tableMode, onAdded }) {
  const ref = useRef(null)
  const lenis = useLenis()
  const [variant, setVariant] = useState(0)
  const [choices, setChoices] = useState({})
  const [qty, setQty] = useState(1)
  const [notes, setNotes] = useState('')
  const [missing, setMissing] = useState(null)
  const { add } = useCart()
  const pic = item.image && img(item.image)

  const addToOrder = () => {
    const need = item.options?.find((o) => !choices[o.name])
    if (need) return setMissing(need.name)
    const v = item.variants?.[variant]
    add({ slug: item.id, name: item.name, image: item.image || null, variant: v?.name || null, options: { ...choices }, notes: notes.trim(), unitPrice: v ? v.price : item.price, qty })
    onAdded(`${qty} × ${item.name}`)
    onClose()
  }

  useLayoutEffect(() => {
    lenis?.stop()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    ref.current?.querySelector('.modal__close')?.focus()
    if (!prefersReducedMotion()) {
      gsap.fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' })
      gsap.fromTo(ref.current.querySelector('.modal__card'), { y: 40, scale: 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.55 })
    }
    return () => {
      document.body.style.overflow = prevOverflow
      lenis?.start()
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, lenis])

  const price = item.variants?.length ? item.variants[variant].price : item.price

  return (
    <div className="modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="dish-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__card">
        <button type="button" className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        <div className={`modal__media ${pic ? '' : 'modal__media--empty'}`}>
          {pic ? <img src={pic.sm} srcSet={`${pic.sm} 900w, ${pic.src} 1400w`} sizes="(max-width: 760px) 100vw, 50vw" alt={item.name} /> : <Flame />}
        </div>
        <div className="modal__body">
          <div className="modal__tags">{item.tags?.map((t) => <Sticker key={t} tone={TAG_TONE[t]} rotate={-3}>{TAG_LABEL[t]}</Sticker>)}</div>
          <h2 id="dish-title" className="display modal__title">{item.name}</h2>
          <p className="modal__desc">{item.desc}</p>

          {item.variants?.length > 0 && (
            <div className="modal__group">
              <span className="modal__label">Size</span>
              <div className="chips">
                {item.variants.map((v, i) => (
                  <button key={v.name} type="button" className={`chip ${i === variant ? 'is-on' : ''}`} onClick={() => setVariant(i)}>
                    {v.name} · {fmt(v.price)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {item.options?.map((o) => (
            <div key={o.name} className="modal__group">
              <span className="modal__label">{o.name} {missing === o.name && <em className="modal__err">Please choose one</em>}</span>
              <div className="chips">
                {o.choices.map((c) => (
                  <button key={c} type="button" className={`chip ${choices[o.name] === c ? 'is-on' : ''}`} onClick={() => { setChoices((s) => ({ ...s, [o.name]: c })); setMissing(null) }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {!tableMode && (
            <label className="modal__group">
              <span className="modal__label">Notes for the kitchen (optional)</span>
              <input className="modal__notes" maxLength={140} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. no onions, sauce on the side" />
            </label>
          )}
          <div className="modal__buy">
            <span className="modal__price">{fmt(Math.round(price * qty * 100) / 100)}</span>
            {tableMode ? (
              <span className="modal__hint">Ready to order? Just call one of our team.</span>
            ) : (
              <>
                <QtyStepper value={qty} min={1} max={MAX_QTY} onChange={(q) => setQty(Math.max(1, Math.min(MAX_QTY, q)))} />
                {item.available === false ? (
                  <Button variant="ghost" disabled>Sold out today</Button>
                ) : (
                  <Button variant="primary" icon={<Arrow />} onClick={addToOrder}>Add to order</Button>
                )}
              </>
            )}
          </div>
          <small className="modal__note">{menuNotes?.prices}</small>
        </div>
      </div>
    </div>
  )
}

/* ---------- drinks board ---------- */
function Board({ cat, onAdd, tableMode }) {
  const orderable = !tableMode && onAdd && cat.orderable
  return (
    <div className="board">
      {cat.sections.map((s) => (
        <div key={s.title} className="board__block">
          <div className="board__head">
            <div>
              <h3 className="board__title">{s.title}</h3>
              {s.sub && <p className="board__sub">{s.sub}</p>}
            </div>
            {s.cols.some(Boolean) && (
              <div className="board__cols" aria-hidden="true">{s.cols.map((c) => <span key={c}>{c}</span>)}</div>
            )}
          </div>
          <ul className="board__rows">
            {s.rows.map((r) => (
              <li key={r.id} className={`board__row ${r.available === false ? 'is-sold' : ''}`}>
                <div className="board__name">
                  <b>{r.name}</b>
                  {r.info && <span>{r.info}</span>}
                </div>
                <span className="board__dots" aria-hidden="true" />
                <div className="board__prices">
                  {r.prices.map((p, i) => (
                    <span key={i} aria-label={s.cols[i] ? `${s.cols[i]} ${fmt(p)}` : undefined}>{p == null ? '—' : fmt(p)}</span>
                  ))}
                </div>
                {orderable && (
                  <button type="button" className="board__add" disabled={r.available === false} aria-label={r.available === false ? `${r.name} is sold out` : `Add ${r.name} to order`} onClick={() => onAdd({ slug: r.id, name: r.name, image: null, variant: null, options: {}, notes: '', unitPrice: r.prices.find((p) => p != null), qty: 1 })}>+</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default function Menu({ loaderData }) {
  const { data: menu, isError } = useMenu(loaderData?.menu ?? undefined)
  if (!menu) return <MenuLoading failed={isError} />
  return <MenuBody menu={menu} />
}

function MenuLoading({ failed }) {
  return (
    <div className="menu-page">
      <header className="mhero">
        <div className="container mhero__inner">
          <span className="eyebrow">Dining menu</span>
          <h1 className="display mhero__title">The <span className="text-red">Menu</span></h1>
          <p className="lead mload"><Flame /> {failed ? 'We can’t load the menu right now. Please refresh, or call us on +65 6312 2847.' : 'Firing up the menu…'}</p>
        </div>
      </header>
    </div>
  )
}

function MenuBody({ menu }) {
  const food = useMemo(() => menu.categories.filter((c) => c.group === 'food'), [menu])
  const drinks = useMemo(() => menu.categories.filter((c) => c.group === 'drinks'), [menu])
  const findCat = (key) => menu.categories.find((c) => c.id === key || c.alias?.includes(key))
  const { hash, search } = useLocation()
  const tableMode = new URLSearchParams(search).has('table')
  const [group, setGroup] = useState('food')
  const [active, setActive] = useState(food[0].id)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState([])
  const [open, setOpen] = useState(null)
  const closeModal = useCallback(() => setOpen(null), [])
  const { add, setOpen: openCart } = useCart()
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const onAdded = useCallback((label) => {
    setToast(label)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])
  const addDrink = (line) => {
    add(line)
    onAdded(`1 × ${line.name}`)
  }
  const barRef = useRef(null)
  const lenis = useLenis()
  const cats = group === 'food' ? food : drinks

  // food filtering
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return food
      .map((c) => ({
        ...c,
        items: c.items.filter(
          (it) => (!q || `${it.name} ${it.desc}`.toLowerCase().includes(q)) && filters.every((f) => it.tags?.includes(f)),
        ),
      }))
      .filter((c) => c.items.length)
  }, [food, query, filters])
  const count = shown.reduce((n, c) => n + c.items.length, 0)

  // Position of a section in the page, ignoring CSS transforms (the page transition scales and
  // slides the page in for ~1s, which made getBoundingClientRect point at the wrong section).
  const docTop = (el) => {
    let y = 0
    for (let node = el; node; node = node.offsetParent) y += node.offsetTop
    return y
  }
  const scrollTo = (id, instant = false) => {
    const el = document.getElementById(`cat-${id}`)
    if (!el) return
    const y = docTop(el) - (barRef.current?.offsetHeight || 0) - 90
    const behavior = instant || prefersReducedMotion() ? 'auto' : 'smooth'
    lenis ? lenis.scrollTo(y, { immediate: behavior === 'auto' }) : window.scrollTo({ top: y, behavior })
  }

  // deep links: /menu#grill, #pizza, #bites, #platters, #beer …
  useEffect(() => {
    const key = hash.replace('#', '')
    if (!key) return
    const cat = findCat(key)
    if (!cat) return
    setGroup(cat.group)
    let userScrolled = false
    const stop = () => { userScrolled = true }
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchmove', stop, { passive: true })
    // jump once the section exists, then correct after the page transition has settled
    const timers = [80, 450, 1100].map((ms, i) => setTimeout(() => !userScrolled && scrollTo(cat.id, i === 0), ms))
    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchmove', stop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash])

  // scroll-spy: highlight the chip for the section on screen
  useEffect(() => {
    const els = [...document.querySelectorAll('.mcat')]
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.dataset.cat)),
      { rootMargin: '-35% 0px -60% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [group, shown])

  // keep the active chip visible in the (horizontally scrolling) bar
  useEffect(() => {
    const chip = barRef.current?.querySelector(`[data-chip="${active}"]`)
    const row = chip?.parentElement
    if (chip && row) row.scrollTo({ left: chip.offsetLeft - row.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' })
  }, [active])

  const toggleFilter = (id) => setFilters((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))
  const switchGroup = (g) => {
    setGroup(g)
    setActive((g === 'food' ? food : drinks)[0].id)
    const top = document.querySelector('.mbar')?.offsetTop - 80
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'auto' })
  }

  return (
    <div className={`menu-page ${tableMode ? 'menu-page--table' : ''}`}>
      <header className="mhero">
        <div className="container mhero__inner">
          <span className="eyebrow">Dining menu · Jan 2026</span>
          <h1 className="display mhero__title">The <span className="text-red">Menu</span></h1>
          <p className="lead">
            Sizzling steaks, Italian pizzas, pasta bowls and signature bites, plus Brewerkz craft beer, wines and cocktails.
          </p>
          <div className="mhero__actions">
            <Button variant="ghost" onClick={() => window.print()}>Print menu</Button>
          </div>
          {!tableMode && <p className="mhero__how"><b>Order online for pickup:</b> tap any dish, add it to your order, then check out. Pay online, collect at 163 Rochor Road.</p>}
          {!tableMode && <DeliveryLinks />}
          <p className="mhero__note">{menu.notes?.prices}</p>
        </div>
      </header>

      <div className="mbar" ref={barRef}>
        <div className="container mbar__inner">
          <div className="seg" role="tablist" aria-label="Food or drinks">
            {['food', 'drinks'].map((g) => (
              <button key={g} type="button" role="tab" aria-selected={group === g} className={`seg__btn ${group === g ? 'is-on' : ''}`} onClick={() => switchGroup(g)}>
                {g === 'food' ? 'Food' : 'Drinks'}
              </button>
            ))}
          </div>
          <nav className="mbar__chips" aria-label="Menu sections">
            {(group === 'food' ? shown : drinks).map((c) => (
              <button key={c.id} type="button" data-chip={c.id} className={`mchip ${active === c.id ? 'is-on' : ''}`} onClick={() => scrollTo(c.id)}>
                {c.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="container mbody">
        {group === 'food' && (
          <div className="mtools">
            <label className="msearch">
              <span className="sr-only">Search the menu</span>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <input type="search" placeholder="Search dishes — steak, truffle, prawn…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <div className="chips" role="group" aria-label="Filters">
              {FILTERS.map((f) => (
                <button key={f.id} type="button" aria-pressed={filters.includes(f.id)} className={`chip chip--${f.id} ${filters.includes(f.id) ? 'is-on' : ''}`} onClick={() => toggleFilter(f.id)}>
                  {f.label}
                </button>
              ))}
              {(filters.length > 0 || query) && (
                <button type="button" className="chip chip--clear" onClick={() => { setFilters([]); setQuery('') }}>Clear</button>
              )}
            </div>
            {(filters.length > 0 || query) && <p className="mtools__count" aria-live="polite">{count} {count === 1 ? 'dish' : 'dishes'} found</p>}
          </div>
        )}

        {group === 'food' && count === 0 && (
          <div className="mempty">
            <Flame />
            <p>Nothing on the grill matches that. Try another word or clear the filters.</p>
          </div>
        )}

        {cats === food
          ? shown.map((c) => (
              <section key={c.id} id={`cat-${c.id}`} data-cat={c.id} className="mcat">
                <header className="mcat__head">
                  <h2 className="display mcat__title">{c.name}</h2>
                  {c.note && <p className="mcat__note">{c.note}</p>}
                </header>
                <div className="dishes">
                  {c.items.map((it) => <DishCard key={it.id} item={it} onOpen={setOpen} tableMode={tableMode} />)}
                </div>
              </section>
            ))
          : drinks.map((c) => (
              <section key={c.id} id={`cat-${c.id}`} data-cat={c.id} className="mcat mcat--drinks">
                <header className="mcat__head">
                  <h2 className="display mcat__title">{c.name}</h2>
                  {!c.orderable && <span className="mcat__dinein">Dine-in only · not available for online orders</span>}
                </header>
                <Board cat={c} onAdd={addDrink} tableMode={tableMode} />
              </section>
            ))}

        <p className="mdiet">{menu.notes?.dietary}</p>
      </div>

      {/* print-only: a clean text version of the whole menu (food + drinks) */}
      <div className="print-only print-menu">
        <p className="display print-menu__title" aria-hidden="true">BrewGrillz · Dining Menu</p>
        {food.map((c) => (
          <section key={c.id} className="board__block">
            <h3 className="board__title">{c.name}{c.note ? ` — ${c.note}` : ''}</h3>
            <ul className="board__rows">
              {c.items.map((it) => (
                <li key={it.id} className="board__row">
                  <div className="board__name"><b>{it.name}</b><span>{it.desc}</span></div>
                  <span className="board__dots" />
                  <div className="board__prices">{(it.variants || [{ price: it.price }]).map((v, i) => <span key={i}>{v.name ? `${v.name} ` : ''}{fmt(v.price)}</span>)}</div>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {drinks.map((c) => (
          <section key={c.id}>
            <h2 className="display mcat__title">{c.name}</h2>
            <Board cat={c} />
          </section>
        ))}
        <p>{menu.notes?.prices} {menu.notes?.dietary}</p>
      </div>

      {open && <DishModal item={open} notes={menu.notes} onClose={closeModal} tableMode={tableMode} onAdded={onAdded} />}
      {toast && (
        <div className="toast" role="status">
          <span>Added <b>{toast}</b></span>
          <button type="button" onClick={() => { setToast(null); openCart(true) }}>View order →</button>
        </div>
      )}
    </div>
  )
}
