import { useLayoutEffect, useRef } from 'react'
import { Button, SpinBadge, Sticker, Food, Arrow } from '../../components/ui'
import MoCoLink from '../../motion/MoCoLink'
import { gsap, prefersReducedMotion, isTouch } from '../../motion/gsap'
import { site } from '../../data/site'
import { mainEvent } from '../../data/home'

export default function Hero() {
  const root = useRef(null)

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.1 })
      // Headline + buttons are visible from the very first paint (fast LCP). Only the dish cards + badge animate in.
      tl
        .from('.hero__card', { y: 140, rotate: (i) => (i ? 18 : -14), opacity: 0, stagger: 0.12, duration: 1.1 }, 0)
        .from('.hero__badge', { scale: 0, rotate: -120, duration: 1, ease: 'punch' }, 0.4)

      // Scroll: camera pulls back — headline drifts up, cards fan out, fire dims
      gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } })
        .to('.hero__type', { yPercent: -18, ease: 'none' }, 0)
        .to('.hero__cards', { yPercent: -28, ease: 'none' }, 0)
        .to('.hero__fx', { opacity: 0.4, ease: 'none' }, 0)

      // Mouse parallax on the floating dish cards (desktop)
      if (!isTouch()) {
        const qa = gsap.quickTo('.hero__cards', 'x', { duration: 1 })
        const qb = gsap.quickTo('.hero__cards', 'y', { duration: 1 })
        const move = (e) => {
          qa((e.clientX / window.innerWidth - 0.5) * -30)
          qb((e.clientY / window.innerHeight - 0.5) * -20)
        }
        window.addEventListener('pointermove', move)
        return () => window.removeEventListener('pointermove', move)
      }
    }, root)
    return () => ctx.revert()
  }, [])

  const [a, b] = [mainEvent[0], mainEvent[2]]

  return (
    <section className="hero" ref={root}>
      <div className="hero__fx">
        {/* Simple + fast: a muted looping kitchen/grill video. Until the file exists, the poster photo shows. */}
        <img
          className="hero__video"
          src={site.heroPoster.src}
          srcSet={`${site.heroPoster.xs} 520w, ${site.heroPoster.sm} 900w, ${site.heroPoster.src} 1800w`}
          sizes="100vw"
          alt=""
          decoding="async"
        />
        {site.heroVideo && <video
          className="hero__video hero__video--clip"
          onLoadedData={(e) => e.currentTarget.classList.add('is-ready')}
          src={site.heroVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />}
        <div className="hero__shade" />
      </div>

      <div className="container hero__grid">
        <div className="hero__type">
          <p className="eyebrow hero__eyebrow">Grill &amp; Craft Bar · Bugis, Singapore</p>
          <h1 className="hero__title display">
            <span className="hero__line">Chill it.</span>
            <span className="hero__line hero__line--red">Grill it.</span>
            <span className="hero__line">
              Luv it<span className="text-red">.</span>
            </span>
          </h1>
          <div className="hero__meta">
            <p className="lead">
              Flame-grilled steaks, fall-off-the-bone ribs, wood-board platters, Italian pizza &amp; pasta — and Brewerkz craft beer
              on tap. Right on Rochor Road.
            </p>
            <div className="hero__ctas">
              <Button to="/order" variant="primary" size="lg" icon={<Arrow />}>Order online</Button>
              <Button to="/reserve" variant="ghost" size="lg">Book a table</Button>
            </div>
          </div>
        </div>

        <div className="hero__cards" aria-hidden="true">
          <MoCoLink to="/menu" push className="hero__card hero__card--a" data-cursor-label="Menu" tabIndex={-1}>
            <Food image={a.image} alt="" push eager sizes="(max-width: 760px) 45vw, 24vw" />
            <span className="hero__card-label">
              <b>{a.short}</b> ${a.price}
            </span>
            <Sticker tone="lime" rotate={8} className="hero__card-sticker">{a.tag}</Sticker>
          </MoCoLink>
          <MoCoLink to="/menu" push className="hero__card hero__card--b" data-cursor-label="Menu" tabIndex={-1}>
            <Food image={b.image} alt="" push eager sizes="(max-width: 760px) 45vw, 24vw" />
            <span className="hero__card-label">
              <b>{b.short}</b> ${b.price}
            </span>
          </MoCoLink>
          <SpinBadge className="hero__badge" size={150} />
        </div>
      </div>

    </section>
  )
}
