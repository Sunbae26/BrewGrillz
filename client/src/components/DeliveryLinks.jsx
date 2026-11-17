import { site } from '../data/site'

/** "Want it delivered? We're on GrabFood + foodpanda" */
export default function DeliveryLinks({ compact = false, className = '' }) {
  return (
    <div className={`delivery ${compact ? 'delivery--compact' : ''} ${className}`}>
      <span className="delivery__k">{compact ? 'Delivery:' : 'Want it delivered? Find us on'}</span>
      <a className="delivery__btn delivery__btn--grab" href={site.delivery.grab} target="_blank" rel="noreferrer">GrabFood</a>
      <a className="delivery__btn delivery__btn--panda" href={site.delivery.foodpanda} target="_blank" rel="noreferrer">foodpanda</a>
    </div>
  )
}
