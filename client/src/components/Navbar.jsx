import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import MoCoLink from '../motion/MoCoLink'
import { Button } from './ui'
import { nav, site } from '../data/site'
import { gsap, prefersReducedMotion } from '../motion/gsap'
import { useLenis } from '../motion/SmoothScroll'

export default function Navbar() {
  const [solid, setSolid] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const lenis = useLenis()
  const { pathname } = useLocation()

  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setSolid(y > 40)
      setHidden(y > 300 && y > last + 2)
      if (y < last - 2) setHidden(false)
      last = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [pathname])

  // Full-screen menu: links whip in with blur + skew
  useEffect(() => {
    const el = menuRef.current
    if (!el) return
    open ? lenis?.stop() : lenis?.start()
    document.body.style.overflow = open ? 'hidden' : ''
    if (prefersReducedMotion()) return
    if (open) {
      gsap.fromTo(el, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'expo.inOut' })
      gsap.fromTo(el.querySelectorAll('.mnav__link'), { xPercent: 40, skewX: -14, opacity: 0 },
        { xPercent: 0, skewX: 0, opacity: 1, stagger: 0.06, duration: 1, delay: 0.25 })
    }
  }, [open, lenis])

  return (
    <>
      <header className={`nav ${solid ? 'nav--solid' : ''} ${hidden && !open ? 'nav--hidden' : ''} ${open ? 'nav--open' : ''}`}>
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
            <Button to="/order" variant="primary" size="sm">Order online</Button>
          </div>
          <button className={`burger ${open ? 'is-open' : ''}`} onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
            <span /><span />
          </button>
        </div>
      </header>

      {open && (
        <div className="mnav" ref={menuRef}>
          <nav className="mnav__links">
            {[{ label: 'Home', to: '/' }, ...nav, { label: 'Book a table', to: '/reserve' }].map((l, i) => (
              <MoCoLink key={l.to} to={l.to} className="mnav__link display">
                <small>0{i + 1}</small>
                {l.label}
              </MoCoLink>
            ))}
          </nav>
          <div className="mnav__foot">
            <Button to="/order" variant="primary">Order online</Button>
            <a href={site.whatsappHref} className="mnav__wa">WhatsApp {site.whatsapp}</a>
          </div>
        </div>
      )}
    </>
  )
}
