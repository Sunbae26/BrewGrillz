import { useRef } from 'react'
import MoCoLink from '../motion/MoCoLink'
import { punchIn } from '../motion/effects'

/** Button / link with punch-in click. variant: primary | ghost | neon | dark */
export function Button({ to, variant = 'primary', size, icon, children, onClick, className = '', ...rest }) {
  const ref = useRef(null)
  const cls = `btn btn--${variant} ${size ? `btn--${size}` : ''} ${className}`
  const inner = (
    <>
      <span className="btn__spark" aria-hidden="true" />
      <span className="btn__label">{children}</span>
      {icon && <span className="btn__icon" aria-hidden="true">{icon}</span>}
    </>
  )
  const handle = (e) => {
    punchIn(ref.current)
    onClick?.(e)
  }
  if (to)
    return (
      <MoCoLink to={to} className={cls} onClick={handle} ref={ref} data-cursor="hover" {...rest}>
        {inner}
      </MoCoLink>
    )
  return (
    <button ref={ref} className={cls} onClick={handle} data-cursor="hover" {...rest}>
      {inner}
    </button>
  )
}

export function Sticker({ children, tone = 'red', rotate = -6, className = '', style }) {
  return (
    <span className={`sticker sticker--${tone} ${className}`} style={{ '--rot': `${rotate}deg`, ...style }}>
      {children}
    </span>
  )
}

/** Rotating ring-text badge with the flame mark in the middle */
export function SpinBadge({ text = 'CHILL IT • GRILL IT • LUV IT • ', size = 150, className = '' }) {
  return (
    <div className={`spin-badge ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="spin-badge__ring">
        <defs>
          <path id="ring" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <text>
          <textPath href="#ring" startOffset="0">{text.repeat(2)}</textPath>
        </text>
      </svg>
      <Flame className="spin-badge__flame" />
    </div>
  )
}

export function Flame({ className = '' }) {
  return (
    <svg viewBox="0 0 64 80" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M33.6 2c2.8 11.6-4 17.4-9.5 24.3C18.6 33 13 40.4 13 50.6 13 66 23.8 78 37.6 78 50.8 78 61 67.4 61 53.2 61 41 54.2 34.2 50 25.6c-.9 7.6-3.8 11.8-8.2 14.4 2.9-12.6-.6-26.2-8.2-38zM36.8 46.4c1.4 6.8-2.6 10.2-5.4 14-2 2.8-3.4 5.4-3.4 8.4 0 3.6 3.6 6.6 8.4 6.6 5.6 0 9.6-4.2 9.6-10.4 0-6.8-4.4-11.2-9.2-18.6z"
      />
    </svg>
  )
}

export function SectionHead({ eyebrow, title, script, align = 'left', children }) {
  return (
    <header className={`section-head section-head--${align}`}>
      {eyebrow && <span className="eyebrow" data-reveal>{eyebrow}</span>}
      <h2 className="display section-head__title" data-split>
        {title}
      </h2>
      {script && <span className="script section-head__script" data-reveal="0.3">{script}</span>}
      {children && <div className="section-head__body" data-reveal="0.15">{children}</div>}
    </header>
  )
}

/** Responsive food image: small file on phones, big on desktop */
export function Food({ image, alt, className = '', push = false, sizes = '(max-width: 760px) 100vw, 50vw', eager }) {
  return (
    <img
      className={className}
      src={image.src}
      srcSet={`${image.xs ? `${image.xs} 520w, ` : ''}${image.sm} 900w, ${image.src} 1800w`}
      sizes={sizes}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      data-push={push || undefined}
    />
  )
}

export const Arrow = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square">
    <path d="M4 12h15M13 5l7 7-7 7" />
  </svg>
)
