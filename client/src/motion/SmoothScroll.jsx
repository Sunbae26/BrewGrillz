import { createContext, useContext, useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap'

const SMOOTH = false
const LenisContext = createContext(null)
export const useLenis = () => useContext(LenisContext)

/** Lenis smooth scroll, driven by the GSAP ticker so ScrollTrigger stays in sync. */
export default function SmoothScroll({ children }) {
  const [lenis, setLenis] = useState(null)
  const rafRef = useRef(null)

  useEffect(() => {
    // Lenis is OFF by default for speed (native scroll). Set SMOOTH = true to re-enable.
    if (!SMOOTH || prefersReducedMotion()) return
    const l = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true, touchMultiplier: 1.4 })
    l.on('scroll', ScrollTrigger.update)
    rafRef.current = (time) => l.raf(time * 1000)
    gsap.ticker.add(rafRef.current)
    gsap.ticker.lagSmoothing(0)
    setLenis(l)
    return () => {
      gsap.ticker.remove(rafRef.current)
      l.destroy()
    }
  }, [])

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>
}
