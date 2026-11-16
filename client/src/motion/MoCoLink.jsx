import { useMoCo } from './MoCoProvider'

/**
 * Drop-in link with MoCo transitions.
 *  <MoCoLink to="/menu">Menu</MoCoLink>                 → neon flicker transition
 *  <MoCoLink to="/menu" push>…<img data-push/>…</MoCoLink> → camera push-in from the image
 * External links (http, mailto, tel, wa.me) behave like normal anchors.
 */
export default function MoCoLink({ to, push = false, children, onClick, ...rest }) {
  const { go } = useMoCo()
  const external = /^(https?:|mailto:|tel:)/.test(to)

  if (external) {
    return (
      <a href={to} target={to.startsWith('http') ? '_blank' : undefined} rel="noreferrer" onClick={onClick} {...rest}>
        {children}
      </a>
    )
  }

  const handle = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return
    e.preventDefault()
    onClick?.(e)
    const from = push ? e.currentTarget.querySelector('[data-push]') : null
    go(to, { from })
  }

  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  )
}
