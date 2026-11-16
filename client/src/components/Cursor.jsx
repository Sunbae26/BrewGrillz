import { useEffect, useRef } from 'react'
import { gsap, isTouch } from '../motion/gsap'

/** Dot + lagging ring. Hover links → ring grows. [data-cursor-label="View"] → lime label bubble. */
export default function Cursor() {
  const dot = useRef(null)
  const ring = useRef(null)
  const label = useRef(null)

  useEffect(() => {
    if (isTouch()) return
    const dx = gsap.quickTo(dot.current, 'x', { duration: 0.08 })
    const dy = gsap.quickTo(dot.current, 'y', { duration: 0.08 })
    const rx = gsap.quickTo(ring.current, 'x', { duration: 0.45, ease: 'power3' })
    const ry = gsap.quickTo(ring.current, 'y', { duration: 0.45, ease: 'power3' })
    const move = (e) => { document.body.classList.add('has-cursor'); dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY) }
    const over = (e) => {
      const t = e.target.closest('[data-cursor-label], a, button, [data-cursor]')
      const r = ring.current
      r.classList.remove('is-hover', 'is-label')
      if (!t) return
      if (t.dataset.cursorLabel) {
        label.current.textContent = t.dataset.cursorLabel
        r.classList.add('is-label')
      } else r.classList.add('is-hover')
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerover', over, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
    }
  }, [])

  return (
    <>
      <div className="cursor" ref={dot} aria-hidden="true" />
      <div className="cursor-ring" ref={ring} aria-hidden="true"><span ref={label} /></div>
    </>
  )
}
