import { useRef } from 'react'
import MoCoLink from '../../motion/MoCoLink'
import { useReveals } from '../../motion/effects'
import { gsap, isTouch } from '../../motion/gsap'
import { categories } from '../../data/home'
import { SectionHead, Sticker, Food, Flame } from '../../components/ui'

function tilt(e) {
  if (isTouch()) return
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width - 0.5
  const y = (e.clientY - r.top) / r.height - 0.5
  gsap.to(el, { rotateY: x * 10, rotateX: -y * 10, duration: 0.6, ease: 'power3' })
}
const untilt = (e) => gsap.to(e.currentTarget, { rotateY: 0, rotateX: 0, duration: 0.9, ease: 'power3' })

export default function PickYourFire() {
  const root = useRef(null)
  useReveals(root)

  return (
    <section className="section pyf" ref={root}>
      <div className="container">
        <SectionHead eyebrow="The menu" title="Pick your fire" script="tap a card — we’ll zoom you in">
          <p className="lead">Five ways to eat, one big flame. Everything’s cooked to order, everything’s made to share (or not).</p>
        </SectionHead>

        <div className="pyf__grid">
          {categories.map((c, i) => (
            <MoCoLink
              key={c.id}
              to={`/menu#${c.id}`}
              push
              className={`pyf__card pyf__card--${i}`}
              data-cursor-label="Zoom in"
              data-reveal={i * 0.06}
              onPointerMove={tilt}
              onPointerLeave={untilt}
            >
              <div className="pyf__media">
                <Food image={c.image} alt={c.title} push sizes="(max-width: 760px) 100vw, 40vw" />
              </div>
              <div className="pyf__body">
                <span className="pyf__num">0{i + 1}</span>
                <h3 className="display pyf__title">{c.title}</h3>
                <span className="pyf__note">{c.note}</span>
              </div>
              <Sticker tone={i % 2 ? 'lime' : 'cream'} rotate={i % 2 ? 7 : -7} className="pyf__sticker">{c.sticker}</Sticker>
            </MoCoLink>
          ))}

          <MoCoLink to="/bar" className="pyf__card pyf__card--bar" data-cursor-label="Cheers" data-reveal="0.3" onPointerMove={tilt} onPointerLeave={untilt}>
            <div className="pyf__neon">
              <span className="neon neon--lime display">Bar</span>
              <span className="neon neon--red script">on tap</span>
            </div>
            <div className="pyf__body">
              <span className="pyf__num">06</span>
              <h3 className="display pyf__title">Craft &amp; Cocktails</h3>
              <span className="pyf__note">Brewerkz taps · buckets of 5 · wines · spirits</span>
            </div>
            <Flame className="pyf__flame" />
          </MoCoLink>
        </div>
      </div>
    </section>
  )
}
