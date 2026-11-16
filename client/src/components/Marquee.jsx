import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger, prefersReducedMotion } from '../motion/gsap'

/**
 * Infinite marquee. Speeds up + skews with scroll velocity (feels like a camera whip).
 * direction: 1 = leftwards, -1 = rightwards
 */
export default function Marquee({ items, direction = 1, speed = 40, className = '', separator = '✦' }) {
  const root = useRef(null)
  const track = useRef(null)

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const el = track.current
    const ctx = gsap.context(() => {
      const half = el.scrollWidth / 2
      const tween = gsap.fromTo(
        el,
        { x: direction > 0 ? 0 : -half },
        { x: direction > 0 ? -half : 0, duration: half / speed, ease: 'none', repeat: -1 },
      )
      // Scroll velocity → speed + skew. One ticker callback instead of new tweens on every scroll event.
      const skew = gsap.quickTo(el, 'skewX', { duration: 0.5, ease: 'power3' })
      let target = 1, current = 1, settle
      const st = ScrollTrigger.create({
        trigger: root.current,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          const v = self.getVelocity()
          target = (1 + Math.min(Math.abs(v) / 400, 4)) * (v < 0 ? -1 : 1)
          skew(gsap.utils.clamp(-12, 12, (v / 300) * -direction))
          clearTimeout(settle)
          settle = setTimeout(() => skew(0), 140)
        },
        onToggle: (self) => tween.paused(!self.isActive), // don't animate marquees that are off-screen
        onLeave: () => { target = 1; skew(0) },
        onLeaveBack: () => { target = 1; skew(0) },
      })
      const tick = () => {
        if (!st.isActive && Math.abs(current - 1) < 0.01) return
        current += (target - current) * 0.12
        target += (1 - target) * 0.05
        tween.timeScale(current)
      }
      gsap.ticker.add(tick)
      return () => { gsap.ticker.remove(tick); clearTimeout(settle) }
    }, root)
    return () => ctx.revert()
  }, [direction, speed])

  const row = (k) =>
    items.flatMap((t, i) => [
      <span key={`${k}t${i}`} className="marquee__item">{t}</span>,
      <span key={`${k}s${i}`} className="marquee__sep" aria-hidden="true">{separator}</span>,
    ])

  return (
    <div className={`marquee ${className}`} ref={root} aria-label={items.join(', ')}>
      <div className="marquee__track" ref={track} aria-hidden="true">
        {row('a')}
        {row('b')}
        {row('c')}
        {row('d')}
      </div>
    </div>
  )
}
