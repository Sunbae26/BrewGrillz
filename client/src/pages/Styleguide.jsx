import { useRef } from 'react'
import { Button, Sticker, SpinBadge, Arrow, Food } from '../components/ui'
import Marquee from '../components/Marquee'
import MoCoLink from '../motion/MoCoLink'
import { useReveals } from '../motion/effects'
import { mainEvent } from '../data/home'

const colors = [
  ['Brand Red', '--red', '#DA3833'],
  ['Red Deep', '--red-deep', '#9E1F1B'],
  ['Charcoal', '--char', '#141110'],
  ['Logo Charcoal', '--char-3', '#322D2B'],
  ['Cream', '--cream', '#F5EFE6'],
  ['Paper', '--paper', '#EFE4CF'],
  ['Amber', '--amber', '#FFB238'],
  ['Hop Lime', '--lime', '#C6FF3D'],
]

export default function Styleguide() {
  const root = useRef(null)
  useReveals(root)
  return (
    <div className="sg" ref={root}>
      <div className="container">
        <header className="sg__head">
          <span className="eyebrow">Sprint 0 · Design system</span>
          <h1 className="display sg__title" data-split>Neon Saloon</h1>
          <p className="lead">BrewGrillz brand red + charcoal from the logo, a western slab voice, neon-bar pops, film grain and MoCo motion.</p>
        </header>

        <section className="sg__block">
          <h2 className="sg__h">Colour</h2>
          <div className="sg__colors">
            {colors.map(([n, v, hex]) => (
              <div key={v} className="sg__swatch">
                <span style={{ background: `var(${v})` }} />
                <b>{n}</b>
                <code>{v} · {hex}</code>
              </div>
            ))}
          </div>
        </section>

        <section className="sg__block">
          <h2 className="sg__h">Type</h2>
          <div className="sg__type">
            <p className="display" style={{ fontSize: 'var(--fs-h1)' }}>Anton — Grill it.</p>
            <p className="western" style={{ fontSize: 'var(--fs-h3)' }}>Rye — Wanted: Hungry Outlaws</p>
            <p className="script" style={{ fontSize: 'var(--fs-h3)', color: 'var(--red)' }}>Permanent Marker — luv it!</p>
            <p>Manrope — body copy. Flame-grilled steaks, fall-off-the-bone ribs and Brewerkz craft beer on tap.</p>
            <p className="display outline" style={{ fontSize: 'var(--fs-h2)' }}>Outline display</p>
          </div>
        </section>

        <section className="sg__block">
          <h2 className="sg__h">Buttons (click = punch-in)</h2>
          <div className="sg__row">
            <Button variant="primary" icon={<Arrow />}>Order online</Button>
            <Button variant="ghost">Book a table</Button>
            <Button variant="neon">See the bar</Button>
            <Button variant="dark">Dark</Button>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="lg">Large</Button>
          </div>
        </section>

        <section className="sg__block">
          <h2 className="sg__h">Stickers, badges, neon</h2>
          <div className="sg__row">
            <Sticker tone="red">Chef’s Pick</Sticker>
            <Sticker tone="lime" rotate={6}>Signature</Sticker>
            <Sticker tone="cream" rotate={-3}>Spicy</Sticker>
            <Sticker tone="dark" rotate={4}>Veg</Sticker>
            <SpinBadge size={130} />
            <span className="neon neon--lime display" style={{ fontSize: '3.4rem' }}>On tap</span>
            <span className="neon neon--red display" style={{ fontSize: '3.4rem' }}>Open</span>
          </div>
        </section>

        <section className="sg__block">
          <h2 className="sg__h">Form fields</h2>
          <div className="sg__form">
            <label className="field"><span>Name</span><input placeholder="Jane Tan" /></label>
            <label className="field"><span>Guests</span>
              <select defaultValue="4"><option>2</option><option>4</option><option>6</option><option>8+</option></select>
            </label>
            <label className="field field--wide"><span>Notes</span><textarea rows="3" placeholder="Birthday? Allergies? Tell us." /></label>
          </div>
        </section>

        <section className="sg__block">
          <h2 className="sg__h">MoCo transitions</h2>
          <p className="text-dim">Whip-pan between pages, or push the camera into a photo.</p>
          <div className="sg__row">
            <Button to="/menu" variant="primary">Whip-pan → Menu</Button>
            <Button to="/" variant="ghost">Whip-pan → Home</Button>
          </div>
          <div className="sg__push">
            {mainEvent.slice(0, 3).map((d) => (
              <MoCoLink key={d.id} to="/menu" push className="sg__push-card" data-cursor-label="Push in">
                <Food image={d.image} alt={d.name} push sizes="30vw" />
                <span>{d.short} — push-in</span>
              </MoCoLink>
            ))}
          </div>
        </section>
      </div>
      <Marquee className="marquee--red" items={['Marquee', 'Scroll fast', 'It speeds up', 'and skews']} />
    </div>
  )
}
