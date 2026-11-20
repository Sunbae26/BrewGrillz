import { useLayoutEffect } from 'react'
import { gsap, prefersReducedMotion, isTouch } from './gsap'

/** Button punch-in: quick camera "punch" zoom + ember flash. */
export function punchIn(el) {
  if (!el || prefersReducedMotion()) return
  gsap.fromTo(el, { scale: 0.9 }, { scale: 1, duration: 0.5, ease: 'punch', overwrite: 'auto' })
  const spark = el.querySelector('.btn__spark')
  if (spark) gsap.fromTo(spark, { opacity: 0.9, scale: 0.4 }, { opacity: 0, scale: 1.8, duration: 0.45, ease: 'power2.out' })
}

/**
 * Scroll reveals for everything inside `scopeRef`:
 *  [data-split] / [data-reveal] → fade + slide up (data-reveal value = delay in s, optional)
 *  [data-reveal="whip"]          → slide in from the side
 * Runs once per element and never re-animates on scroll back.
 */
export function useReveals(scopeRef, deps = []) {
  useLayoutEffect(() => {
    if (!scopeRef.current || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      // One light tween per element (transform + opacity only — GPU-friendly in Chrome, Safari and Firefox)
      const els = scopeRef.current.querySelectorAll('[data-split], [data-reveal]')
      const touch = isTouch() // phones: a shorter, smaller slide so it never fights the finger
      els.forEach((el) => {
        const v = el.dataset.reveal
        const whip = v === 'whip'
        gsap.from(el, {
          x: whip ? (touch ? -24 : -60) : 0,
          y: whip ? 0 : touch ? 14 : 40,
          opacity: 0,
          duration: touch ? 0.55 : 0.9,
          delay: whip ? 0 : parseFloat(v) || 0,
          ease: 'ramp',
          scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        })
      })
    }, scopeRef)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
