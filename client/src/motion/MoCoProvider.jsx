import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap'
import { useLenis } from './SmoothScroll'

/*
  Page transitions.

  go(to)                → NEON FLICKER: the screen dims, the destination's name flickers on
                          like a neon sign (same feel as "Craft on Tap" + the footer), cut,
                          then the sign switches off and the new page appears. ~0.9s total.
  go(to, { from: el })  → PUSH-IN: the clicked photo flies to fill the screen, then the new
                          page fades up behind it.

  Only opacity/transform are animated — cheap in Chrome, Safari and Firefox.
*/

const MoCoContext = createContext({ go: () => {} })
export const useMoCo = () => useContext(MoCoContext)

// What the neon sign says for each page
const LABELS = {
  '/': ['BREW', 'GRILLZ'],
  '/menu': ['THE', 'MENU'],
  '/bar': ['THE', 'BAR'],
  '/our-place': ['OUR', 'PLACE'],
  '/events': ['EVENTS', ''],
  '/rewards': ['REWARDS', ''],
  '/reserve': ['BOOK A', 'TABLE'],
  '/order': ['ORDER', 'ONLINE'],
  '/styleguide': ['STYLE', 'GUIDE'],
}

// neon "switching on": opacity keyframes with hard steps
const FLICKER_ON = [0, 0.9, 0.15, 1, 0.35, 1, 0.6, 1]

export default function MoCoProvider({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const lenis = useLenis()
  const overlayRef = useRef(null)
  const signRef = useRef(null)
  const busy = useRef(false)
  const pendingIn = useRef(null) // 'neon' | 'push' | null
  const cloneRef = useRef(null)
  const [label, setLabel] = useState(LABELS['/'])

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
        else window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      if (prefersReducedMotion()) {
        navigate(to)
        toTop()
        return
      }
      busy.current = true
      const tl = gsap.timeline({
        onComplete: () => {
          toTop()
          navigate(to)
        },
      })

      if (opts.from) {
        // ---------- PUSH-IN from a photo ----------
        pendingIn.current = 'push'
        const el = opts.from
        const r = el.getBoundingClientRect()
        const clone = document.createElement('div')
        clone.className = 'moco__clone'
        Object.assign(clone.style, {
          top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px`,
          backgroundImage: `url(${el.currentSrc || el.src})`,
        })
        document.body.appendChild(clone)
        cloneRef.current = clone
        tl.to(clone, { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight, borderRadius: 0, duration: 0.6, ease: 'power3.inOut' }, 0)
      } else {
        // ---------- NEON FLICKER ----------
        pendingIn.current = 'neon'
        setLabel(LABELS[path] || LABELS['/'])
        const words = signRef.current.querySelectorAll('.moco__word')
        tl.set(overlayRef.current, { visibility: 'visible' })
          .fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'power2.out' }, 0)
          .set(words, { opacity: 0 }, 0)
        words.forEach((w, i) => {
          tl.to(w, { keyframes: FLICKER_ON.map((o) => ({ opacity: o, duration: 0.05, ease: 'steps(1)' })) }, 0.12 + i * 0.1)
        })
        tl.to({}, { duration: 0.12 }) // let the sign glow for a beat
      }
    },
    [location.pathname, navigate, toTop],
  )

  // After the route changes: switch the sign off / fade the photo, reveal the new page
  useLayoutEffect(() => {
    const mode = pendingIn.current
    if (!mode) return
    pendingIn.current = null
    const p = firstSection()
    const tl = gsap.timeline({
      onComplete: () => {
        busy.current = false
        if (p) gsap.set(p, { clearProps: 'transform,opacity' })
        ScrollTrigger.refresh()
      },
    })
    if (mode === 'push' && cloneRef.current) {
      const clone = cloneRef.current
      if (p) tl.fromTo(p, { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 0.8 }, 0.05)
      tl.to(clone, { opacity: 0, duration: 0.5, ease: 'power2.out', onComplete: () => { clone.remove(); cloneRef.current = null } }, 0)
    } else {
      const words = signRef.current.querySelectorAll('.moco__word')
      tl.to(words, { keyframes: [0.3, 1, 0].map((o) => ({ opacity: o, duration: 0.05, ease: 'steps(1)' })) }, 0.05)
        .to(overlayRef.current, { opacity: 0, duration: 0.35, ease: 'power2.inOut' }, 0.15)
        .set(overlayRef.current, { visibility: 'hidden' })
      if (p) tl.fromTo(p, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7 }, 0.2)
    }
  }, [location.pathname])

  return (
    <MoCoContext.Provider value={{ go }}>
      {children}
      <div className="moco" ref={overlayRef} aria-hidden="true">
        <div className="moco__sign" ref={signRef}>
          <span className="moco__word moco__word--white">{label[0]}</span>
          <span className="moco__word moco__word--red">{label[1]}</span>
        </div>
      </div>
    </MoCoContext.Provider>
  )
}
