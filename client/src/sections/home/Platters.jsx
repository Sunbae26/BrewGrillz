import { useRef } from 'react'
import { useReveals } from '../../motion/effects'
import { platters } from '../../data/home'
import { SectionHead, Button, Food, Arrow } from '../../components/ui'
import MoCoLink from '../../motion/MoCoLink'

/* Western twist: the sharing platters as WANTED posters. */
export default function Platters() {
  const root = useRef(null)
  useReveals(root)

  return (
    <section className="section platters" ref={root}>
      <div className="platters__bg display" aria-hidden="true">SQUAD</div>
      <div className="container platters__wrap">
        <div className="platters__intro">
          <SectionHead eyebrow="Sharing platters" title="Bring the squad" script="3–4 hungry outlaws">
            <p className="lead">
              Two wood-board platters piled high with the best of the grill. Pick two sides, grab the sauces, and fight over the last
              rib.
            </p>
          </SectionHead>
          <div className="platters__ctas" data-reveal="0.2">
            <Button to="/reserve" variant="primary" icon={<Arrow />}>Book for the squad</Button>
            <Button to="/menu#platters" variant="ghost">Order to share</Button>
          </div>
        </div>

        <div className="platters__posters">
          {platters.map((p, i) => (
            <MoCoLink key={p.id} to="/menu#platters" push className={`poster poster--${i}`} data-reveal={0.1 + i * 0.12} data-cursor-label="Wanted">
              <div className="poster__paper">
                <span className="poster__wanted western">Wanted</span>
                <span className="poster__sub">for crimes against hunger</span>
                <div className="poster__photo">
                  <Food image={p.image} alt={p.name} push sizes="(max-width: 760px) 90vw, 30vw" />
                </div>
                <h3 className="poster__name western">{p.name}</h3>
                <ul className="poster__list">
                  {p.items.map((it) => <li key={it}>{it}</li>)}
                </ul>
                <div className="poster__reward">
                  <span>Reward</span>
                  <b className="western">${p.price}</b>
                  <span>feeds {p.pax}</span>
                </div>
              </div>
              <span className="poster__pin" aria-hidden="true" />
            </MoCoLink>
          ))}
        </div>
      </div>
    </section>
  )
}
