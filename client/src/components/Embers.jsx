import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../motion/gsap'

/** Rising, flickering embers. Uses two pre-rendered glow sprites (no per-frame gradients) at ~30fps. */
function sprite(hue) {
  const s = document.createElement('canvas')
  s.width = s.height = 32
  const g = s.getContext('2d')
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  gr.addColorStop(0, `hsla(${hue},100%,72%,1)`)
  gr.addColorStop(0.35, `hsla(${hue},100%,55%,0.55)`)
  gr.addColorStop(1, `hsla(${hue},100%,50%,0)`)
  g.fillStyle = gr
  g.fillRect(0, 0, 32, 32)
  return s
}

export default function Embers({ count = 40, className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const c = ref.current
    const ctx = c.getContext('2d')
    const sprites = [sprite(16), sprite(38)]
    let w, h, raf, last = 0, visible = true
    const dpr = 1
    const n = window.innerWidth < 760 ? Math.round(count * 0.5) : count
    const resize = () => {
      w = c.clientWidth; h = c.clientHeight
      c.width = w * dpr; c.height = h * dpr
    }
    resize()
    const make = (init) => ({
      x: Math.random() * w,
      y: init ? Math.random() * h : h + 10,
      s: Math.random() * 10 + 4,
      vy: Math.random() * 1.6 + 0.7,
      vx: (Math.random() - 0.5) * 0.8,
      life: Math.random() * 0.6 + 0.4,
      ph: Math.random() * Math.PI * 2,
      k: Math.random() < 0.7 ? 0 : 1,
    })
    const ps = Array.from({ length: n }, () => make(true))
    const tick = (t) => {
      raf = requestAnimationFrame(tick)
      if (!visible || document.hidden || t - last < 32) return
      last = t
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      for (const p of ps) {
        p.y -= p.vy
        p.x += p.vx + Math.sin(t / 700 + p.ph) * 0.6
        const k = p.y / h
        if (p.y < -10 || k < 0.05) Object.assign(p, make(false))
        ctx.globalAlpha = Math.max(0, Math.min(1, k * p.life * (0.55 + Math.sin(t / 90 + p.ph * 3) * 0.45)))
        ctx.drawImage(sprites[p.k], p.x - p.s / 2, p.y - p.s / 2, p.s, p.s)
      }
      ctx.globalAlpha = 1
    }
    raf = requestAnimationFrame(tick)
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(c)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [count])

  return <canvas ref={ref} className={`embers ${className}`} aria-hidden="true" />
}
