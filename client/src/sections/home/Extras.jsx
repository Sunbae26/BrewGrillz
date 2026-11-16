import { useRef, useState } from 'react'
import { useReveals } from '../../motion/effects'
import { gsap, isTouch } from '../../motion/gsap'
import { site } from '../../data/site'
import { Button, Arrow, Flame, Food } from '../../components/ui'
import { categories, mainEvent, platters } from '../../data/home'

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

/* Map loads only when tapped — keeps the page light */
function MapFacade() {
  const [live, setLive] = useState(false)
  return (
    <div className="visit__map" data-reveal="whip">
      {live ? (
        <iframe title="BrewGrillz on Google Maps" src={site.mapsEmbed} referrerPolicy="no-referrer-when-downgrade" />
      ) : (
        <button type="button" className="visit__facade" onClick={() => setLive(true)} data-cursor-label="Map">
          <span className="visit__grid" aria-hidden="true" />
          <span className="visit__pin"><Flame /></span>
          <span className="visit__facade-txt">
            <b>163 Rochor Road</b>
            <span>Tap to load the map</span>
          </span>
        </button>
      )}
    </div>
  )
}

/* ---------- Visit ---------- */
export function Visit() {
  const root = useRef(null)
  useReveals(root)
  return (
    <section className="section visit" ref={root} id="visit">
      <div className="container visit__grid">
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
        <MapFacade />
      </div>
    </section>
  )
}
