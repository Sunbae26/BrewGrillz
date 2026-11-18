import { useRef, useState } from 'react'
import { useReveals } from '../../motion/effects'
import { gsap, isTouch } from '../../motion/gsap'
import { site } from '../../config/site'
import { Button, Arrow, Flame, Food } from '../ui/ui'
import { categories, mainEvent, platters } from '../../config/home'

/* ---------- Rewards: a metal member card that tilts with the cursor ---------- */
export function Rewards() {
  const root = useRef(null)
  useReveals(root)
  const move = (e) => {
    if (isTouch()) return
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    gsap.to(el, { rotateY: x * 22, rotateX: -y * 18, duration: 0.6, ease: 'power3' })
    el.style.setProperty('--gx', `${(x + 0.5) * 100}%`)
    el.style.setProperty('--gy', `${(y + 0.5) * 100}%`)
  }
  const leave = (e) => gsap.to(e.currentTarget, { rotateY: -12, rotateX: 6, duration: 1.2, ease: 'power3' })

  return (
    <section className="section rewards" ref={root}>
      <div className="container rewards__grid">
        <div className="rewards__card-wrap" data-reveal="whip">
          <div className="mcard" onPointerMove={move} onPointerLeave={leave}>
            <div className="mcard__shine" />
            <div className="mcard__top">
              <img src="/brand/logo-nav.webp" alt="" width="150" height="47" />
              <span className="mcard__tier">Inferno</span>
            </div>
            <div className="mcard__chip" />
            <div className="mcard__num">BGZ ✦ 0188 ✦ 438 ✦ 2026</div>
            <div className="mcard__bottom">
              <span>Member</span>
              <b className="display">Rewards Club</b>
            </div>
          </div>
        </div>
        <div className="rewards__copy">
          <span className="eyebrow" data-reveal>BrewGrillz Rewards</span>
          <h2 className="display rewards__title" data-split>Eat. Drink. Earn.</h2>
          <p className="lead" data-reveal="0.1">
            Collect points every time you dine in or order online, then turn them into rewards on your next visit.
          </p>
          <ul className="rewards__steps" data-reveal="0.2">
            <li><b>01</b> Sign up free</li>
            <li><b>02</b> Earn on every bill</li>
            <li><b>03</b> Redeem for the good stuff</li>
          </ul>
          <div data-reveal="0.3"><Button to="/rewards" variant="primary" icon={<Arrow />}>Join the club</Button></div>
        </div>
      </div>
    </section>
  )
}

/* ---------- XCAPE partner ticket ---------- */
export function Xcape() {
  const root = useRef(null)
  useReveals(root)
  return (
    <section className="xcape-wrap" ref={root}>
      <div className="container">
        <a className="ticket" href="https://www.xcape.sg" target="_blank" rel="noreferrer" data-reveal="whip" data-cursor-label="Escape">
          <div className="ticket__main">
            <span className="eyebrow">Partner perk</span>
            <h3 className="display ticket__title">Dinner, then <span className="text-red">escape.</span></h3>
            <p>Show your BrewGrillz receipt at <b>XCAPE</b> — Singapore’s reality escape rooms — and get <b>$5 off</b> your game.</p>
          </div>
          <div className="ticket__stub">
            <span className="ticket__off display">$5</span>
            <span className="ticket__lbl">off at XCAPE</span>
            <span className="ticket__go">xcape.sg <Arrow /></span>
          </div>
        </a>
      </div>
    </section>
  )
}

/* ---------- Social wall ---------- */
export function Social() {
  const root = useRef(null)
  useReveals(root)
  const pics = [mainEvent[0].image, categories[1].image, platters[1].image, categories[3].image, mainEvent[2].image, categories[4].image]
  return (
    <section className="section social" ref={root}>
      <div className="container">
        <div className="social__head">
          <h2 className="display social__title" data-split>
            Tag us <span className="text-red">@brewgrillz</span>
          </h2>
          <div className="social__links" data-reveal="0.1">
            <Button to={site.socials.instagram} variant="ghost" size="sm">Instagram</Button>
            <Button to={site.socials.tiktok} variant="ghost" size="sm">TikTok</Button>
            <Button to={site.socials.facebook} variant="ghost" size="sm">Facebook</Button>
          </div>
        </div>
        <div className="social__grid">
          {pics.map((p, i) => (
            <a key={i} href={site.socials.instagram} target="_blank" rel="noreferrer" className={`social__tile social__tile--${i}`} data-reveal={i * 0.05} data-cursor-label="Follow">
              <Food image={p} alt="BrewGrillz on Instagram" sizes="(max-width: 760px) 50vw, 18vw" />
            </a>
          ))}
        </div>
        <div className="social__review" data-reveal>
          <Flame className="social__flame" />
          <p>Had a great night? A Google review helps a small grill go a long way.</p>
          <Button to={site.reviewUrl} variant="primary" size="sm" icon={<Arrow />}>Leave a review</Button>
        </div>
      </div>
    </section>
  )
}

/* Neon street map: drawn in SVG (no image, a few KB). The live Google map loads only when asked for. */
function NeonMap() {
  return (
    <svg className="nmap" viewBox="0 0 600 460" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Map: BrewGrillz at 163 Rochor Road, a short walk from Bugis MRT">
      <defs>
        <pattern id="nmap-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="rgba(245,239,230,0.05)" strokeWidth="1" />
        </pattern>
        <filter id="nmap-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="nmap-halo">
          <stop offset="0" stopColor="#da3833" stopOpacity="0.55" />
          <stop offset="1" stopColor="#da3833" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="600" height="460" fill="#141110" />
      <rect width="600" height="460" fill="url(#nmap-grid)" />
      {/* city blocks */}
      <g fill="#1d1918" stroke="rgba(245,239,230,0.06)">
        <path d="M70 40h150l-40 120H40z" /><path d="M250 30h130l-30 110H215z" /><path d="M410 40h160v90H385z" />
        <path d="M30 230h120l-30 110H10z" /><path d="M380 250h190v110H350z" /><path d="M150 390h170l-15 60H130z" />
        <path d="M420 390h150v60H405z" />
      </g>
      {/* canal */}
      <path className="nmap__canal" d="M0 420 C150 400 260 440 420 395 S560 360 600 370" />
      {/* streets */}
      <g className="nmap__roads">
        <path d="M-10 200 L610 175" /><path d="M200 -10 L120 470" /><path d="M395 -10 L330 470" />
        <path d="M-10 365 L610 330" /><path d="M520 -10 L560 470" />
      </g>
      <path className="nmap__main" d="M-10 285 L610 225" />
      <g className="nmap__labels">
        <text x="430" y="216" transform="rotate(-5.5 430 216)">ROCHOR ROAD</text>
        <text x="40" y="192" transform="rotate(-2.3 40 192)">VICTORIA ST</text>
        <text x="212" y="80" transform="rotate(-80 212 80)">QUEEN ST</text>
        <text x="404" y="70" transform="rotate(-81 404 70)">N BRIDGE RD</text>
        <text x="455" y="352" transform="rotate(-3.3 455 352)">ROCHOR CANAL</text>
      </g>
      {/* Bugis MRT */}
      <g className="nmap__mrt" transform="translate(92 118)">
        <rect x="-30" y="-15" width="60" height="30" rx="15" />
        <text y="5">MRT</text>
        <text className="nmap__mrt-name" y="34">BUGIS</text>
      </g>
      {/* walking route */}
      <path className="nmap__route" d="M110 136 C150 190 210 238 300 254" />
      <text className="nmap__walk" x="168" y="236" transform="rotate(24 168 236)">short walk</text>
      {/* BrewGrillz: pin with the name tag pointing right at it */}
      <g transform="translate(304 255)">
        <circle r="70" fill="url(#nmap-halo)" className="nmap__halo" />
        <circle r="16" className="nmap__ring" />
        <circle r="7" fill="#da3833" filter="url(#nmap-glow)" />
        <g className="nmap__tag">
          <rect x="-96" y="-102" width="192" height="58" rx="10" />
          <path d="M-10 -45 L0 -24 L10 -45 Z" className="nmap__tag-tip" />
          <text x="0" y="-74" textAnchor="middle" className="nmap__tag-name">BREW<tspan fill="#da3833">GRILLZ</tspan></text>
          <text x="0" y="-56" textAnchor="middle" className="nmap__tag-addr">163 Rochor Road · S188438</text>
        </g>
      </g>
      <text className="nmap__scale" x="586" y="448" textAnchor="end">not to scale</text>
    </svg>
  )
}

function VisitMap() {
  const [live, setLive] = useState(false)
  return (
    <div className="visit__map" data-reveal="whip">
      {live ? (
        <iframe className="visit__live" title="BrewGrillz on Google Maps" src={site.mapsEmbed} referrerPolicy="no-referrer-when-downgrade" />
      ) : (
        <NeonMap />
      )}
      <div className="visit__map-bar">
        <a className="visit__map-btn visit__map-btn--red" href={site.mapsUrl} target="_blank" rel="noreferrer" data-cursor="hover">Get directions →</a>
        <button type="button" className="visit__map-btn" onClick={() => setLive((v) => !v)} data-cursor="hover">
          {live ? 'Back to neon map' : 'Open live map'}
        </button>
      </div>
    </div>
  )
}

/* ---------- Visit ---------- */
export function Visit() {
  const root = useRef(null)
  useReveals(root)
  return (
    <section className="section visit" ref={root} id="visit">
      <div className="container visit__wrap">
        <div className="visit__copy">
          <span className="eyebrow" data-reveal>Pull up a chair</span>
          <h2 className="display visit__title" data-split>163 Rochor Rd.</h2>
          <p className="visit__addr" data-reveal="0.1">{site.address.line2}, {site.address.city} — a short walk from Bugis MRT.</p>
          <dl className="visit__hours" data-reveal="0.15">
            {site.hours.map((h) => (
              <div key={h.label}><dt>{h.label}</dt><dd>{h.value}</dd></div>
            ))}
            <div><dt>Call</dt><dd><a href={site.phoneHref}>{site.phone}</a></dd></div>
            <div><dt>WhatsApp</dt><dd><a href={site.whatsappHref} target="_blank" rel="noreferrer">{site.whatsapp}</a></dd></div>
          </dl>
          <div className="visit__ctas" data-reveal="0.2">
            <Button to="/reserve" variant="primary" icon={<Arrow />}>Book a table</Button>
            <Button to={site.mapsUrl} variant="ghost">Get directions</Button>
          </div>
        </div>
        <VisitMap />
      </div>
    </section>
  )
}
