import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, prefersReducedMotion } from '../../motion/gsap'
import { mainEvent } from '../../config/home'
import { Button, Sticker, Food, Arrow } from '../ui/ui'

/*
  THE MAIN EVENT — autoplay slideshow (no scroll-jacking).
  - Changes every 5s, pauses on hover / when off-screen / when the tab is hidden
  - 01–04 tabs, ← → arrows, swipe on touch, arrow keys when focused
  - Each change is a quick MoCo "whip": transform + opacity only (smooth in every browser)
*/
const DELAY = 5000

export default function MainEvent() {
  const root = useRef(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(false)
  const prev = useRef(0)
  const dir = useRef(1)
  const n = mainEvent.length

  const go = useCallback((i, d) => {
    setIndex((cur) => {
      const next = (i + n) % n
      dir.current = d ?? (next > cur ? 1 : -1)
      return next
    })
  }, [n])
  const step = useCallback((d) => setIndex((cur) => { dir.current = d; return (cur + d + n) % n }), [n])

  // initial state: only the first slide visible
  useLayoutEffect(() => {
    const q = gsap.utils.selector(root)
    gsap.set(q('.me__shot, .me__info, .me__word'), { autoAlpha: 0 })
    gsap.set([q('.me__shot')[0], q('.me__info')[0], q('.me__word')[0]], { autoAlpha: 1 })
  }, [])

  // animate on change
  useLayoutEffect(() => {
    const from = prev.current
    const to = index
    if (from === to) return
    prev.current = to
    const q = gsap.utils.selector(root)
    const [shots, infos, words] = [q('.me__shot'), q('.me__info'), q('.me__word')]
    if (prefersReducedMotion()) {
      gsap.set([shots[from], infos[from], words[from]], { autoAlpha: 0 })
      gsap.set([shots[to], infos[to], words[to]], { autoAlpha: 1 })
      return
    }
    const d = dir.current
    const tl = gsap.timeline({ defaults: { overwrite: 'auto' } })
    tl.to(shots[from], { xPercent: -30 * d, scale: 1.12, autoAlpha: 0, duration: 0.45, ease: 'power3.in' }, 0)
      .to(infos[from], { y: -30, autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, 0)
      .to(words[from], { xPercent: -20 * d, autoAlpha: 0, duration: 0.35, ease: 'power2.in' }, 0)
      .fromTo(q('.me__streaks'), { autoAlpha: 0, xPercent: 20 * d }, { autoAlpha: 1, xPercent: -20 * d, duration: 0.25, ease: 'power2.in', yoyo: true, repeat: 1 }, 0.1)
      .fromTo(shots[to], { xPercent: 40 * d, scale: 1.18, rotate: 4 * d, autoAlpha: 0 }, { xPercent: 0, scale: 1, rotate: 0, autoAlpha: 1, duration: 0.9, ease: 'ramp' }, 0.2)
      .fromTo(infos[to], { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'ramp' }, 0.32)
      .fromTo(words[to], { xPercent: 25 * d, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.8, ease: 'ramp' }, 0.26)
    return () => tl.progress(1)
  }, [index])

  // only autoplay while on screen
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 })
    io.observe(root.current)
    return () => io.disconnect()
  }, [])

  // autoplay timer (restarts after every manual change)
  useEffect(() => {
    if (paused || !visible || prefersReducedMotion()) return
    const t = setTimeout(() => { if (!document.hidden) step(1) }, DELAY)
    return () => clearTimeout(t)
  }, [index, paused, visible, step])

  // swipe
  const touch = useRef(null)
  const onTouchStart = (e) => { touch.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touch.current == null) return
    const dx = e.changedTouches[0].clientX - touch.current
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1)
    touch.current = null
  }
  const onKey = (e) => {
    if (e.key === 'ArrowRight') step(1)
    if (e.key === 'ArrowLeft') step(-1)
  }

  const running = !paused && visible

  return (
    <section
      className="me"
      ref={root}
      id="main-event"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={onKey}
      aria-roledescription="carousel"
      aria-label="Signature dishes"
    >
      <div className="me__stage">
        <div className="me__words" aria-hidden="true">
          {mainEvent.map((d) => (
            <span key={d.id} className="me__word display outline">{d.short}</span>
          ))}
        </div>

        <div className="me__frame" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {mainEvent.map((d, i) => (
            <figure key={d.id} className="me__shot" style={{ '--focus': d.focus || '50% 50%' }} aria-hidden={i !== index}>
              <Food image={d.image} alt={d.name} sizes="(max-width: 760px) 100vw, 60vw" eager={i === 0} />
            </figure>
          ))}
          <div className="me__streaks" aria-hidden="true" />
          <span className="me__corner me__corner--tl" />
          <span className="me__corner me__corner--br" />
          <span className="me__rec"><i /> REC · Main event</span>
          <div className="me__arrows">
            <button type="button" onClick={() => step(-1)} aria-label="Previous dish">←</button>
            <button type="button" onClick={() => step(1)} aria-label="Next dish">→</button>
          </div>
        </div>

        <div className="me__panel container">
          <div className="me__head">
            <span className="eyebrow">The main event</span>
            <div className="me__ticks" role="tablist">
              {mainEvent.map((d, i) => (
                <button
                  key={d.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`0${i + 1} ${d.name}`}
                  className={`me__tick ${i === index ? 'is-on' : ''}`}
                  onClick={() => go(i)}
                >
                  0{i + 1}
                  {i === index && <span key={`${index}-${running}`} className={`me__bar ${running ? 'is-running' : ''}`} style={{ '--dur': `${DELAY}ms` }} />}
                </button>
              ))}
            </div>
          </div>
          <div className="me__infos" aria-live="polite">
            {mainEvent.map((d, i) => (
              <article key={d.id} className="me__info" aria-hidden={i !== index}>
                <Sticker tone={i % 2 ? 'cream' : 'red'} rotate={-5}>{d.tag}</Sticker>
                <h3 className="display me__name">{d.name}</h3>
                <p className="me__desc">{d.desc}</p>
                <div className="me__buy">
                  <span className="me__price"><small>$</small>{d.price}<em>{d.weight}</em></span>
                  <Button to={d.id === "mixed-grill" ? "/menu#platters" : "/menu#grill"} variant="primary" size="sm" icon={<Arrow />} tabIndex={i === index ? 0 : -1}>Order</Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
