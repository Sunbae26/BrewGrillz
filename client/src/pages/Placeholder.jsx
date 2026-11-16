import { useRef } from 'react'
import { useReveals } from '../motion/effects'
import { Button, Arrow, Flame } from '../components/ui'

/* Styled holding page for routes built in later sprints. */
export default function Placeholder({ title, sprint, blurb, notFound = false }) {
  const root = useRef(null)
  useReveals(root, [title])
  return (
    <section className="ph" ref={root}>
      <div className="ph__fx" aria-hidden="true" />
      <div className="container ph__inner">
        <Flame className="ph__flame" />
        <span className="eyebrow" data-reveal>{notFound ? 'Error 404' : `Coming in Sprint ${sprint}`}</span>
        <h1 className="display ph__title" data-split>{title}</h1>
        <p className="lead" data-reveal="0.15">{blurb}</p>
        <div className="ph__ctas" data-reveal="0.25">
          <Button to="/" variant="primary" icon={<Arrow />}>Back to the grill</Button>
          {!notFound && <Button to="/styleguide" variant="ghost">View style guide</Button>}
        </div>
      </div>
    </section>
  )
}
