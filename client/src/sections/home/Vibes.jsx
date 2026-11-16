import { useRef } from 'react'
import { useReveals } from '../../motion/effects'
import { vibes } from '../../data/home'
import { SectionHead, Food } from '../../components/ui'

/* GOOD VIBES ONLY — a native swipe/scroll row (no scroll-jacking: fast in every browser). */
export default function Vibes() {
  const root = useRef(null)
  const track = useRef(null)
  useReveals(root)

  const nudge = (dir) => {
    const el = track.current
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' })
  }

  return (
    <section className="section vibes" ref={root}>
      <div className="container vibes__head">
        <SectionHead eyebrow="Our place" title="Good vibes only" script="music · laughter · flame-grilled everything" />
        <div className="vibes__arrows">
          <button type="button" onClick={() => nudge(-1)} aria-label="Previous">←</button>
          <button type="button" onClick={() => nudge(1)} aria-label="Next">→</button>
        </div>
      </div>
      <div className="vibes__track" ref={track}>
        {vibes.map((v, i) =>
          v.type === 'img' ? (
            <figure key={i} className={`vibe vibe--img vibe--${i % 3}`}>
              <div className="vibe__media"><Food image={v.image} alt={v.caption} sizes="(max-width: 760px) 80vw, 34vw" /></div>
              <figcaption>{v.caption}</figcaption>
            </figure>
          ) : (
            <div key={i} className={`vibe vibe--text vibe--${v.tone || 'dark'}`}>
              <span className="display vibe__big">{v.big}</span>
              <span className="vibe__small">{v.small}</span>
            </div>
          ),
        )}
      </div>
    </section>
  )
}
