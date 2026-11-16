import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, prefersReducedMotion } from '../motion/gsap'

/** First-visit slate: badge punches in, flame flickers, then a whip-cut into the site. Once per session. */
export default function Intro() {
  const [show, setShow] = useState(() => {
    try { return !sessionStorage.getItem('bgz-intro') && !prefersReducedMotion() } catch { return false }
  })
  const ref = useRef(null)

  useLayoutEffect(() => {
    if (!show) return
    try { sessionStorage.setItem('bgz-intro', '1') } catch { /* private mode */ }
    const el = ref.current
    const tl = gsap.timeline({ onComplete: () => setShow(false) })
    tl.from(el.querySelector('.intro__badge'), { scale: 2.4, opacity: 0, duration: 0.9 })
      .from(el.querySelectorAll('.intro__word'), { yPercent: 120, skewY: 8, stagger: 0.08, duration: 0.8 }, 0.25)
      .to(el.querySelector('.intro__count'), { width: '100%', duration: 0.9, ease: 'power2.inOut' }, 0.2)
      .to(el.querySelector('.intro__inner'), { xPercent: -30, skewX: 10, opacity: 0, duration: 0.45, ease: 'whip' }, 1.35)
      .to(el, { clipPath: 'inset(0 100% 0 0)', duration: 0.6, ease: 'expo.inOut' }, 1.45)
    return () => tl.kill()
  }, [show])

  if (!show) return null
  return (
    <div className="intro" ref={ref} aria-hidden="true">
      <div className="intro__inner">
        <img className="intro__badge" src="/brand/logo-badge.png" alt="" width="180" height="176" />
        <div className="intro__words display">
          <span className="intro__word">Chill it.</span>
          <span className="intro__word text-red">Grill it.</span>
          <span className="intro__word">Luv it.</span>
        </div>
        <div className="intro__bar"><span className="intro__count" /></div>
      </div>
    </div>
  )
}
