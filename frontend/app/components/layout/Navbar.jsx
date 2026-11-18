import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import MoCoLink from '../../motion/MoCoLink'
import { Button } from '../ui/ui'
import { nav, site } from '../../config/site'
import { gsap, prefersReducedMotion } from '../../motion/gsap'
import { useLenis } from '../../motion/SmoothScroll'
import { useCart } from '../../lib/cart.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { isStaff } from '../../lib/admin.js'

export default function Navbar() {
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const lenis = useLenis()
  const { pathname } = useLocation()
  const { count, ready, setOpen: openCart } = useCart()
  const { user } = useAuth()
  const account = user ? { to: isStaff(user) ? '/admin' : '/account', label: isStaff(user) ? 'Dashboard' : 'My account' } : { to: '/login', label: 'Sign in' }

  // The navbar always stays on screen; it only gets a solid background once you scroll.
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [pathname])

  // Full-screen menu: links whip in with blur + skew
  useEffect(() => {
    // Lock the page behind the open menu, and ALWAYS unlock when it closes (the menu is already gone by then).
    open ? lenis?.stop() : lenis?.start()
    document.body.style.overflow = open ? 'hidden' : ''
    const el = menuRef.current
    if (!el || prefersReducedMotion()) return
    if (open) {
      gsap.fromTo(el, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'expo.inOut' })
      gsap.fromTo(el.querySelectorAll('.mnav__link'), { xPercent: 40, skewX: -14, opacity: 0 },
        { xPercent: 0, skewX: 0, opacity: 1, stagger: 0.06, duration: 1, delay: 0.25 })
    }
  }, [open, lenis])

  useEffect(() => () => { document.body.style.overflow = '' }, [])

  return (
    <>
      <header className={`nav ${solid ? 'nav--solid' : ''} ${open ? 'nav--open' : ''}`}>
        <div className="nav__inner">
          <MoCoLink to="/" className="nav__logo" aria-label="BrewGrillz home">
            <img src="/brand/logo-nav.webp" alt="BrewGrillz Singapore" width="190" height="59" />
          </MoCoLink>
          <nav className="nav__links" aria-label="Main">
            {nav.map((l) => (
              <MoCoLink key={l.to} to={l.to} className={`nav__link ${pathname === l.to ? 'is-active' : ''}`}>
                <span data-text={l.label}>{l.label}</span>
              </MoCoLink>
            ))}
          </nav>
          <div className="nav__cta">
            <Button to="/reserve" variant="ghost" size="sm">Book a table</Button>
            <Button to="/menu" variant="primary" size="sm">Order online</Button>
          </div>
          <div className="nav__icons">
          <MoCoLink to={account.to} className={`acctbtn ${user ? 'is-in' : ''}`} aria-label={account.label} data-cursor="hover">
            {user ? (
              <span className="acctbtn__initial" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</span>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.4-4 4.4-6 8-6s6.6 2 8 6" /></svg>
            )}
          </MoCoLink>
          <button type="button" className="cartbtn" onClick={() => openCart(true)} aria-label={`Your order${ready && count ? `, ${count} items` : ''}`} data-cursor="hover">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
            {ready && count > 0 && <span className="cartbtn__n">{count}</span>}
          </button>
          </div>
          <button className={`burger ${open ? 'is-open' : ''}`} onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
            <span /><span />
          </button>
        </div>
      </header>

      {open && (
        // any link in the menu closes it, even the page you're already on
        <div className="mnav" ref={menuRef} onClick={(e) => e.target.closest('a') && setOpen(false)}>
          <nav className="mnav__links">
            {[{ label: 'Home', to: '/' }, ...nav, { label: 'Book a table', to: '/reserve' }].map((l, i) => (
              <MoCoLink key={l.to} to={l.to} className="mnav__link display">
                <small>0{i + 1}</small>
                {l.label}
              </MoCoLink>
            ))}
          </nav>
          <div className="mnav__foot">
            <Button to="/menu" variant="primary">Order online</Button>
            <Button to={account.to} variant="ghost">{account.label}</Button>
            <a href={site.whatsappHref} className="mnav__wa">WhatsApp {site.whatsapp}</a>
          </div>
        </div>
      )}
    </>
  )
}
