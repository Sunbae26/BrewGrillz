import { createContext, useCallback, useContext, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap'
import { useLenis } from './SmoothScroll'

/*
  MoCo — "motion-control camera" page transitions.

  go(to)                → WHIP-PAN: page streaks sideways with motion blur, coloured
                          light bars sweep across like a fast camera whip, cut, and the
                          new page speed-ramps into focus.
  go(to, { from: el })  → PUSH-IN: the clicked image flies to fill the screen (camera
                          rushing into the dish), then the new page ramps in behind it.
*/

const MoCoContext = createContext({ go: () => {} })
export const useMoCo = () => useContext(MoCoContext)

const BAR_COLORS = ['#da3833', '#322d2b', '#f5efe6', '#9e1f1b', '#1d1918', '#da3833', '#ffb238']

export default function MoCoProvider({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const lenis = useLenis()
  const overlayRef = useRef(null)
  const busy = useRef(false)
  const pendingIn = useRef(null) // 'whip' | 'push' | null
  const cloneRef = useRef(null)

  const page = () => document.querySelector('.page')
  // Only the first viewport-sized section is animated — transforming/blurring the whole page is what made clicks stutter
  const firstSection = () => document.querySelector('.page > :first-child')

  const toTop = useCallback(() => {
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
    window.scrollTo(0, 0)
  }, [lenis])

  const go = useCallback(
    (to, opts = {}) => {
      if (busy.current) return
      const [path, hash] = to.split('#')
      if (path === location.pathname && !opts.force) {
        if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
        else lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      if (prefersReducedMotion()) {
        navigate(to)
        toTop()
        return
      }
      busy.current = true
      const bars = overlayRef.current.querySelectorAll('.moco__bar')
      const tl = gsap.timeline({
        onComplete: () => {
          toTop()
          navigate(to)
        },
      })

      if (opts.from) {
        // ---------- PUSH-IN from an image ----------
        pendingIn.current = 'push'
        const el = opts.from
        const r = el.getBoundingClientRect()
        const src = el.currentSrc || el.src || el.dataset.src
        const clone = document.createElement('div')
        clone.className = 'moco__clone'
        Object.assign(clone.style, {
          top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px`,
          backgroundImage: `url(${src})`,
        })
        document.body.appendChild(clone)
        cloneRef.current = clone
        tl.to(clone, {
            top: 0, left: 0, width: window.innerWidth, height: window.innerHeight, borderRadius: 0,
            duration: 0.62, ease: 'power3.inOut',
          }, 0)
          .to(clone, { scale: 1.06, duration: 0.62, ease: 'power2.in' }, 0)
      } else {
        // ---------- WHIP-PAN ----------
        pendingIn.current = 'whip'
        tl.set(overlayRef.current, { visibility: 'visible' })
          .fromTo(bars, { xPercent: 105 }, { xPercent: 0, duration: 0.42, stagger: 0.03, ease: 'whip' }, 0)
          .to('.moco__streak', { xPercent: -60, opacity: 1, duration: 0.42, ease: 'whip' }, 0)
      }
    },
    [location.pathname, navigate, lenis, toTop],
  )

  // Animate the NEW page in after the route has changed
  useLayoutEffect(() => {
    const mode = pendingIn.current
    if (!mode) return
    pendingIn.current = null
    const p = firstSection()
    const bars = overlayRef.current.querySelectorAll('.moco__bar')
    const flash = overlayRef.current.querySelector('.moco__flash')
    const tl = gsap.timeline({
      onComplete: () => {
        busy.current = false
        if (p) gsap.set(p, { clearProps: 'transform,opacity' })
        ScrollTrigger.refresh()
      },
    })
    if (mode === 'push' && cloneRef.current) {
      const clone = cloneRef.current
      if (p) tl.fromTo(p, { scale: 1.08, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.1 }, 0.05)
      tl.to(clone, { opacity: 0, scale: 1.25, duration: 0.6, ease: 'power2.out', onComplete: () => { clone.remove(); cloneRef.current = null } }, 0)
    } else {
      tl.fromTo(flash, { opacity: 0.55 }, { opacity: 0, duration: 0.5, ease: 'power2.out' }, 0)
        .to(bars, { xPercent: -105, duration: 0.6, stagger: 0.035 }, 0.02)
        .fromTo('.moco__streak', { xPercent: -60, opacity: 1 }, { xPercent: -160, opacity: 0, duration: 0.5, ease: 'power2.out' }, 0)
      if (p) tl.fromTo(p, { x: '12vw', skewX: -5, opacity: 0 }, { x: 0, skewX: 0, opacity: 1, duration: 1 }, 0.04)
      tl.set(overlayRef.current, { visibility: 'hidden' })
    }
  }, [location.pathname])

  return (
    <MoCoContext.Provider value={{ go }}>
      {children}
      <div className="moco" ref={overlayRef} aria-hidden="true">
        {BAR_COLORS.map((c, i) => (
          <div key={i} className="moco__bar" style={{ background: c }}>
            <span className="moco__lines" />
          </div>
        ))}
        <div className="moco__streak" />
        <div className="moco__flash" />
      </div>
    </MoCoContext.Provider>
  )
}
