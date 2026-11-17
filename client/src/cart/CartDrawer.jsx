import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useCart, lineKey } from './CartProvider'
import { Button, Arrow, Flame } from '../components/ui'
import MoCoLink from '../motion/MoCoLink'
import DeliveryLinks from '../components/DeliveryLinks'
import { gsap, prefersReducedMotion } from '../motion/gsap'
import { useLenis } from '../motion/SmoothScroll'

export function QtyStepper({ value, onChange, min = 0, label = 'Quantity' }) {
  return (
    <div className="qty" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease">−</button>
      <span aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} aria-label="Increase">+</button>
    </div>
  )
}

export const lineExtras = (l) => [l.variant, ...Object.values(l.options || {})].filter(Boolean).join(' · ')

export default function CartDrawer() {
  const { lines, count, subtotal, setQty, open, setOpen } = useCart()
  const panel = useRef(null)
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
            <p className="drawer__pickup">Pickup only · 163 Rochor Road, Bugis</p>
            <ul className="drawer__lines">
              {lines.map((l) => (
                <li key={lineKey(l)} className="cline">
                  {l.image ? <img src={`/images/food/${l.image}-xs.webp`} alt="" className="cline__img" loading="lazy" /> : <span className="cline__img cline__img--empty"><Flame /></span>}
                  <div className="cline__info">
                    <b>{l.name}</b>
                    {lineExtras(l) && <span>{lineExtras(l)}</span>}
                    {l.notes && <span>“{l.notes}”</span>}
                    <QtyStepper value={l.qty} onChange={(q) => setQty(lineKey(l), q)} />
                  </div>
                  <span className="cline__price">${(l.unitPrice * l.qty).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <footer className="drawer__foot">
              <div className="drawer__total"><span>Subtotal <small>incl. GST</small></span><b>${subtotal.toFixed(2)}</b></div>
              <Button to="/order" variant="primary" size="lg" icon={<Arrow />} className="drawer__checkout">Checkout</Button>
              <MoCoLink to="/menu" className="drawer__more">+ Add more from the menu</MoCoLink>
              <DeliveryLinks compact />
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}
