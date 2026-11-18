import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, prefersReducedMotion } from '../../motion/gsap'
import MoCoLink from '../../motion/MoCoLink'
import { nav, site } from '../../config/site'
import { Button, Arrow } from '../ui/ui'
import { apiPost } from '../../lib/api.js'

function Newsletter() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle') // idle | loading | ok | err
  const submit = async (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setState('err')
    setState('loading')
    try {
      await apiPost('/newsletter', { email, source: 'footer' })
      setState('ok')
    } catch {
      setState('err')
    }
  }
  if (state === 'ok') return <p className="news__ok script">You’re on the list. See you at the grill!</p>
  return (
    <form className="news" onSubmit={submit} noValidate>
      <label htmlFor="news-email" className="sr-only">Email address</label>
      <input id="news-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => { setEmail(e.target.value); setState('idle') }} />
      <Button variant="primary" size="sm" type="submit" icon={<Arrow />} disabled={state === 'loading'}>
        {state === 'loading' ? 'Sending' : 'Join'}
      </Button>
      {state === 'err' && <span className="news__err">Please check your email and try again.</span>}
    </form>
  )
}

export default function Footer() {
  const mega = useRef(null)
  // Neon sign "turning on": flickers like the CRAFT ON TAP sign, then stays lit
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.from(mega.current.querySelectorAll('.mega-neon'), {
        opacity: 0.12, duration: 0.08, repeat: 6, yoyo: true, ease: 'steps(1)', stagger: 0.3,
        scrollTrigger: { trigger: mega.current, start: 'top 90%', once: true },
      })
    }, mega)
    return () => ctx.revert()
  }, [])

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <img src="/brand/logo-badge.webp" alt="BrewGrillz — Finest Grill Dining & Bar" width="150" height="147" loading="lazy" />
          <p className="script footer__tag">Chill it.. Grill it.. Luv it..</p>
        </div>
        <div>
          <h4 className="footer__h">Explore</h4>
          <ul className="footer__list">
            {nav.map((l) => <li key={l.to}><MoCoLink to={l.to}>{l.label}</MoCoLink></li>)}
            <li><MoCoLink to="/reserve">Book a table</MoCoLink></li>
            <li><MoCoLink to="/menu">Order online</MoCoLink></li>
            <li><MoCoLink to="/track">Track an order</MoCoLink></li>
          </ul>
        </div>
        <div>
          <h4 className="footer__h">Find us</h4>
          <address className="footer__list">
            <span>{site.address.line1}</span>
            <span>{site.address.line2}, {site.address.city}</span>
            <a href={site.phoneHref}>{site.phone}</a>
            <a href={site.whatsappHref} target="_blank" rel="noreferrer">WhatsApp {site.whatsapp}</a>
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </address>
        </div>
        <div>
          <h4 className="footer__h">Get the good stuff</h4>
          <p className="footer__small">New dishes, event nights and members-only deals. No spam, just steak.</p>
          <Newsletter />
          <div className="footer__socials">
            <a href={site.socials.instagram} target="_blank" rel="noreferrer">Instagram</a>
            <a href={site.socials.tiktok} target="_blank" rel="noreferrer">TikTok</a>
            <a href={site.socials.facebook} target="_blank" rel="noreferrer">Facebook</a>
          </div>
        </div>
      </div>
      <div className="footer__mega display" ref={mega} aria-hidden="true"><span className="mega-neon mega-neon--white">BREW</span><span className="mega-neon mega-neon--red">GRILLZ</span></div>
      <div className="container footer__bottom">
        <span>© {new Date().getFullYear()} BrewGrillz Singapore. {site.priceNote}</span>
        <span>
          <MoCoLink to="/privacy">Privacy</MoCoLink> · <MoCoLink to="/terms">Terms</MoCoLink> · <MoCoLink to="/admin/login">Staff login</MoCoLink>
        </span>
      </div>
    </footer>
  )
}
