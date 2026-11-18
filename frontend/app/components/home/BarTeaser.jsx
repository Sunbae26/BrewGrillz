import { useLayoutEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from '../../motion/gsap'
import { useReveals } from '../../motion/effects'
import { taps, cocktails } from '../../config/home'
import { Button, Arrow } from '../ui/ui'
import Marquee from '../layout/Marquee'

export function Pint({ color, fill }) {
  return (
    <svg className="pint" viewBox="0 0 120 200" aria-hidden="true">
      <defs>
        <clipPath id={`glass-${color.slice(1)}`}>
          <path d="M14 8h92l-10 176a10 10 0 0 1-10 9H34a10 10 0 0 1-10-9z" />
        </clipPath>
        <linearGradient id={`beer-${color.slice(1)}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor="#b5640a" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#glass-${color.slice(1)})`}>
        <g className="pint__liquid" data-fill={fill} transform={`translate(0 ${200 - 200 * fill})`}>
          <rect x="0" y="0" width="120" height="200" fill={`url(#beer-${color.slice(1)})`} />
          <path className="pint__foam" d="M0 0 Q15 -10 30 0 T60 0 T90 0 T120 0 V22 H0Z" fill="#fff8e7" />
          {[18, 40, 62, 84, 100].map((x, i) => (
            <circle key={x} className="pint__bubble" cx={x} cy={180 - i * 9} r={1.6 + (i % 3)} fill="rgba(255,255,255,.55)" />
          ))}
        </g>
      </g>
      <path className="pint__glass" d="M14 8h92l-10 176a10 10 0 0 1-10 9H34a10 10 0 0 1-10-9z" fill="none" />
      <path d="M26 30l6 140" stroke="rgba(255,255,255,.25)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

export default function BarTeaser() {
  const root = useRef(null)
  useReveals(root)

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      // pour: liquid rises when the taps come into view
      gsap.utils.toArray('.pint__liquid').forEach((el, i) => {
        const fill = parseFloat(el.dataset.fill)
        gsap.fromTo(el, { y: 200 }, {
          y: 200 - 200 * fill, duration: 2.2, ease: 'power2.out', delay: i * 0.18,
          scrollTrigger: { trigger: el.closest('.taps'), start: 'top 75%' },
        })
      })
      // neon flicker-on
      gsap.from('.bar__sign .neon', {
        opacity: 0.05, duration: 0.08, repeat: 6, yoyo: true, ease: 'steps(1)', stagger: 0.25,
        scrollTrigger: { trigger: '.bar__sign', start: 'top 80%' },
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section className="bar" ref={root}>
      <div className="bar__glow" aria-hidden="true" />
      <div className="container">
        <div className="bar__sign">
          <span className="eyebrow">After dark at BrewGrillz</span>
          <h2 className="display bar__title">
            <span className="neon neon--red">Craft</span> <span className="neon neon--lime">on tap</span>
          </h2>
          <p className="lead">
            Three house beers brewed by <b>Brewerkz</b> exclusively for BrewGrillz, poured by the 480ml pint. Plus buckets of five,
            proper cocktails and a wine list worth sitting down for.
          </p>
        </div>

        <div className="taps">
          {taps.map((t, i) => (
            <article key={t.name} className="tap" data-reveal={i * 0.1}>
              <Pint color={t.color} fill={t.fill} />
              <div className="tap__info">
                <span className="tap__abv">{t.abv}% ABV</span>
                <h3 className="display tap__name">{t.name}</h3>
                <span className="tap__style">{t.style}</span>
                <p className="tap__notes">{t.notes}</p>
                <span className="tap__price"><small>$</small>13.5 <em>/ pint</em></span>
              </div>
            </article>
          ))}
        </div>

        <div className="bar__deals" data-reveal>
          <div className="deal deal--bucket">
            <span className="deal__k">Bucket of 5</span>
            <b className="display">from $40</b>
            <span className="deal__s">Tiger · Corona · Heineken · Asahi · Peroni & more</span>
          </div>
          <div className="deal deal--sling">
            <span className="deal__k">House legend</span>
            <b className="display">Singapore Sling $18</b>
            <span className="deal__s">You’re in Singapore. It’s the law. (It isn’t. But still.)</span>
          </div>
          <Button to="/bar" variant="neon" icon={<Arrow />}>See the full bar</Button>
        </div>
      </div>

      <Marquee
        className="marquee--neon"
        items={cocktails.map((c) => `${c.name} $${c.price}`)}
        speed={55}
        separator="●"
      />
    </section>
  )
}
