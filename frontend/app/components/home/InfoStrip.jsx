import { site } from '../../config/site'
import { Button, Arrow } from '../ui/ui'
import DeliveryLinks from '../ui/DeliveryLinks'

/* Straight to the point: when we're open, where we are, how to reach us. Static = zero cost. */
export default function InfoStrip() {
  return (
    <section className="info" aria-label="Opening hours and location">
      <div className="container info__grid">
        <div className="info__item">
          <span className="info__k"><i className="pulse" /> Open today</span>
          <span className="info__v">10am – 11pm</span>
          <span className="info__s">Kitchen 11:30am – 10:30pm</span>
        </div>
        <a className="info__item" href={site.mapsUrl} target="_blank" rel="noreferrer">
          <span className="info__k">Find us</span>
          <span className="info__v">163 Rochor Road</span>
          <span className="info__s">Bugis Street, S188438 · Directions →</span>
        </a>
        <a className="info__item" href={site.phoneHref}>
          <span className="info__k">Call</span>
          <span className="info__v">{site.phone}</span>
          <span className="info__s">Reservations &amp; enquiries</span>
        </a>
        <a className="info__item" href={site.whatsappHref} target="_blank" rel="noreferrer">
          <span className="info__k">WhatsApp</span>
          <span className="info__v">{site.whatsapp}</span>
          <span className="info__s">Quick replies</span>
        </a>
        <div className="info__cta">
          <Button to="/menu" variant="primary" icon={<Arrow />}>Order for pickup</Button>
          <DeliveryLinks compact />
        </div>
      </div>
    </section>
  )
}
