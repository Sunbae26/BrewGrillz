import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { useCart, lineKey, lineExtras } from '../../lib/cart.jsx'
import QtyStepper from '../ui/QtyStepper'
import TrashIcon from '../ui/TrashIcon'
import { Button, Arrow, Flame } from '../ui/ui'
import MoCoLink from '../../motion/MoCoLink'
import DeliveryLinks from '../ui/DeliveryLinks'
import { gsap, prefersReducedMotion } from '../../motion/gsap'
import { useLenis } from '../../motion/SmoothScroll'

export default function CartDrawer() {
  const { lines, count, subtotal, soldOut, setQty, clear, open, setOpen } = useCart()
  const panel = useRef(null)
  const [confirmClear, setConfirmClear] = useState(false)
  useEffect(() => {
    if (!confirmClear) return
    const t = setTimeout(() => setConfirmClear(false), 3500)
    return () => clearTimeout(t)
  }, [confirmClear])
  const lenis = useLenis()
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname, setOpen])

  useLayoutEffect(() => {
    if (!open) return
    lenis?.stop()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    panel.current?.querySelector('.drawer__close')?.focus()
    if (!prefersReducedMotion()) gsap.fromTo(panel.current, { xPercent: 100 }, { xPercent: 0, duration: 0.55 })
    return () => {
      document.body.style.overflow = prev
      lenis?.start()
      window.removeEventListener('keydown', onKey)
    }
  }, [open, lenis, setOpen])

  if (!open) return null
  return (
    <div className="drawer-wrap" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <aside className="drawer" ref={panel} role="dialog" aria-modal="true" aria-label="Your order">
        <header className="drawer__head">
          <h2 className="display drawer__title">Your order {count > 0 && <span>({count})</span>}</h2>
          <button type="button" className="drawer__close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </header>

        {lines.length === 0 ? (
          <div className="drawer__empty">
            <Flame />
            <p>Your cart is empty. Time to fire up the grill?</p>
            <Button to="/menu" variant="primary" icon={<Arrow />}>Browse the menu</Button>
          </div>
        ) : (
          <>
            <div className="drawer__pickup">
              <span>Pickup only · 163 Rochor Road, Bugis</span>
              <button type="button" className={`drawer__clear ${confirmClear ? 'is-armed' : ''}`} onClick={() => (confirmClear ? (clear(), setConfirmClear(false)) : setConfirmClear(true))}>
                <TrashIcon /> {confirmClear ? 'Tap again to clear' : 'Clear all'}
              </button>
            </div>
            <ul className="drawer__lines">
              {lines.map((l) => (
                <li key={lineKey(l)} className="cline">
                  {l.image ? <img src={`/images/food/${l.image}-xs.webp`} alt="" className="cline__img" loading="lazy" /> : <span className="cline__img cline__img--empty"><Flame /></span>}
                  <div className="cline__info">
                    <b>{l.name}</b>
                    {lineExtras(l) && <span>{lineExtras(l)}</span>}
                    {l.notes && <span>“{l.notes}”</span>}
                    {l.available === false && <em className="cline__sold">Sold out · please remove</em>}
                    <QtyStepper value={l.qty} onChange={(q) => setQty(lineKey(l), q)} />
                  </div>
                  <div className="cline__side">
                    <span className="cline__price">${(l.unitPrice * l.qty).toFixed(2)}</span>
                    <button type="button" className="cline__del" onClick={() => setQty(lineKey(l), 0)} aria-label={`Remove ${l.name}`} title="Remove"><TrashIcon /></button>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="drawer__foot">
              <div className="drawer__total"><span>Subtotal <small>incl. GST</small></span><b>${subtotal.toFixed(2)}</b></div>
              {soldOut.length > 0 && <p className="drawer__warn" role="alert">Remove the sold-out {soldOut.length === 1 ? 'item' : 'items'} to check out.</p>}
              <Button to="/checkout" variant="primary" size="lg" icon={<Arrow />} className="drawer__checkout" aria-disabled={soldOut.length > 0} onClick={(e) => soldOut.length > 0 && e.preventDefault()}>Checkout</Button>
              <MoCoLink to="/menu" className="drawer__more">+ Add more from the menu</MoCoLink>
              <DeliveryLinks compact />
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}
