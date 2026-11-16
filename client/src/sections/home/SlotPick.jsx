import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, prefersReducedMotion } from '../../motion/gsap'
import { useReveals } from '../../motion/effects'
import { slot } from '../../data/home'
import { Button, Arrow } from '../../components/ui'

/*
  "Can't decide? Pull the lever." — a saloon slot machine that picks a Starter, a Main and a Drink
  at normal menu prices. Purely for fun + to help people choose; NOT a combo deal.
  Reels animate with transform only (smooth on every browser), and only when the user pulls.
*/
const REELS = [
  { key: 'starters', label: 'Starter' },
  { key: 'mains', label: 'Main' },
  { key: 'drinks', label: 'Drink' },
]
const REPS = 6 // each reel strip repeats its list so it can spin "forever"
const fmt = (n) => `$${n.toFixed(1).replace(/\.0$/, '')}`

export default function SlotPick() {
  const root = useRef(null)
  const strips = useRef([])
  const lever = useRef(null)
  const [picks, setPicks] = useState([0, 2, 0]) // fixed first view (same on server + client)
  const [spinning, setSpinning] = useState(false)
  const [spun, setSpun] = useState(false)
  useReveals(root)

  const tileH = () => strips.current[0]?.firstElementChild?.offsetHeight || 96

  // park each reel on its current pick (also on resize, since tile height is responsive)
  useLayoutEffect(() => {
    const place = () => strips.current.forEach((el, r) => {
      const n = slot[REELS[r].key].length
      gsap.set(el, { y: -(picks[r] + n) * tileH() })
    })
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    const next = REELS.map(({ key }, r) => {
      const n = slot[key].length
      let t = Math.floor(Math.random() * n)
      if (t === picks[r]) t = (t + 1 + Math.floor(Math.random() * (n - 1))) % n // always change
      return t
    })
    const h = tileH()
    const reduce = prefersReducedMotion()

    if (lever.current && !reduce) {
      gsap.timeline()
        .to(lever.current, { rotate: 28, duration: 0.18, ease: 'power2.in' })
        .to(lever.current, { rotate: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' })
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setPicks(next)
        setSpinning(false)
        setSpun(true)
      },
    })
    strips.current.forEach((el, r) => {
      const n = slot[REELS[r].key].length
      gsap.set(el, { y: -(picks[r] + n) * h }) // jump to the same item in the 2nd copy
      const target = -(next[r] + n * (REPS - 2)) * h // land in the 5th copy
      if (reduce) tl.set(el, { y: target }, 0)
      else tl.to(el, { y: target, duration: 1.3 + r * 0.45, ease: 'power3.out' }, 0.05 + r * 0.05)
    })
  }

  const chosen = REELS.map(({ key }, r) => slot[key][picks[r]])
  const total = chosen.reduce((s, it) => s + it.price, 0)

  return (
    <section className="slot" ref={root} aria-labelledby="slot-title">
      <div className="container slot__wrap">
        <div className="slot__intro">
          <span className="eyebrow" data-reveal>Can’t decide?</span>
          <h2 id="slot-title" className="display slot__title" data-split>
            Let the grill <span className="text-red">pick</span>
          </h2>
          <p className="lead" data-reveal="0.1">
            Pull the lever and we’ll line up a starter, a main and a drink from the menu. Don’t like it? Spin again, partner.
          </p>
        </div>

        <div className="machine" data-reveal="0.15">
          <div className="machine__sign" aria-hidden="true">
            <span className="neon neon--red display">Lucky</span> <span className="neon neon--lime display">Grill</span>
          </div>

          <div className="machine__body">
            <div className="machine__reels">
              {REELS.map(({ key, label }, r) => (
                <div key={key} className="reel">
                  <span className="reel__label">{label}</span>
                  <div className="reel__window">
                    <div className="reel__strip" ref={(el) => (strips.current[r] = el)} aria-hidden="true">
                      {Array.from({ length: REPS }).flatMap((_, rep) =>
                        slot[key].map((it, i) => (
                          <div key={`${rep}-${i}`} className="reel__tile">
                            <span className="reel__name">{it.name}</span>
                            <span className="reel__price">{fmt(it.price)}</span>
                          </div>
                        )),
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <span className="machine__payline" aria-hidden="true" />
            </div>

            <button type="button" className="lever" onClick={spin} disabled={spinning} aria-label="Pull the lever">
              <span className="lever__arm" ref={lever}><span className="lever__ball" /></span>
              <span className="lever__base" />
            </button>
          </div>

          <div className="machine__foot">
            <p className="machine__result" aria-live="polite">
              {spun ? (
                <>
                  <span>Your pick:</span> {chosen.map((c) => c.name).join(' + ')} — <b>{fmt(total)}</b>
                </>
              ) : (
                <span>Pull the lever (or hit spin) to see what the grill picks for you.</span>
              )}
            </p>
            <div className="machine__ctas">
              <Button variant="primary" onClick={spin} disabled={spinning}>{spinning ? 'Spinning…' : spun ? 'Spin again' : 'Spin'}</Button>
              {spun && <Button to="/order" variant="ghost" icon={<Arrow />}>Order these</Button>}
            </div>
            <small className="machine__note">Regular menu prices, incl. GST. Just for fun: not a set meal or promotion.</small>
          </div>
        </div>
      </div>
    </section>
  )
}
