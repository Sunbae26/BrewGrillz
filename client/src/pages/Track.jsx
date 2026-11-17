import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useCart } from '../cart/CartProvider'
import { getLocalOrders, saveLocalOrder } from '../cart/localOrders'
import { formatPickup } from '../data/ordering'
import { Button, Arrow, Flame } from '../components/ui'
import MoCoLink from '../motion/MoCoLink'
import { site } from '../data/site'

/* ORDER TRACKING — guests use the private link (email/WhatsApp) or this browser's order list. */
const STEPS = [
  { key: 'PAID', label: 'Order received' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'PREPARING', label: 'On the grill' },
  { key: 'READY', label: 'Ready for pickup' },
  { key: 'COMPLETED', label: 'Collected' },
]
const FINAL = ['COMPLETED', 'CANCELLED', 'REFUNDED']
const LABEL = { PENDING_PAYMENT: 'Waiting for payment', CANCELLED: 'Cancelled', REFUNDED: 'Refunded', ...Object.fromEntries(STEPS.map((s) => [s.key, s.label])) }
const money = (c) => `$${(c / 100).toFixed(2)}`
const time = (iso) => new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))

async function fetchOrder(token) {
  const res = await fetch(`/api/orders/track/${encodeURIComponent(token)}`)
  if (res.status === 404) return { notFound: true }
  if (!res.ok) throw new Error('fetch failed')
  return res.json()
}

function OrderStatus({ token }) {
  const { search } = useLocation()
  const justPaid = new URLSearchParams(search).has('paid')
  const { clear, ready } = useCart()
  const [order, setOrder] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (justPaid && ready) clear() // wait until the saved cart has loaded, or it would come back
  }, [justPaid, ready, clear])

  useEffect(() => {
    let timer
    let stop = false
    const load = async () => {
      try {
        const o = await fetchOrder(token)
        if (stop) return
        setOrder(o)
        setFailed(false)
        if (!o.notFound) saveLocalOrder({ token, number: o.number, at: o.createdAt })
        // keep refreshing until it's finished: quickly while waiting for payment, then every 20s
        if (!o.notFound && !FINAL.includes(o.status)) timer = setTimeout(load, o.status === 'PENDING_PAYMENT' ? 4000 : 20000)
      } catch {
        if (!stop) {
          setFailed(true)
          timer = setTimeout(load, 15000)
        }
      }
    }
    load()
    return () => {
      stop = true
      clearTimeout(timer)
    }
  }, [token])

  if (!order) return <div className="track__loading"><Flame /> {failed ? 'Can’t reach the server — retrying…' : 'Loading your order…'}</div>
  if (order.notFound) {
    return (
      <div className="track__missing">
        <h1 className="display track__title">Order not found</h1>
        <p className="lead">This tracking link doesn’t match an order. Check the link in your email, or WhatsApp us on {site.whatsapp}.</p>
        <Button to="/track" variant="ghost">My orders</Button>
      </div>
    )
  }

  const reached = Object.fromEntries((order.history || []).map((h) => [h.status, h.at]))
  const idx = STEPS.findIndex((s) => s.key === order.status)
  const off = ['CANCELLED', 'REFUNDED'].includes(order.status)

  return (
    <div className="track__card">
      <header className="track__head">
        <span className="eyebrow">Order #{order.number}</span>
        <h1 className="display track__title">
          {order.status === 'READY' ? <>Ready, <span className="text-red">{order.firstName}!</span></> : off ? LABEL[order.status] : <>Thanks, <span className="text-red">{order.firstName}!</span></>}
        </h1>
        <p className="track__pickup">Pickup <b>{formatPickup(order.pickupAt)}</b> · 163 Rochor Road, Bugis</p>
      </header>

      {order.status === 'PENDING_PAYMENT' ? (
        <p className="track__wait"><Flame /> Confirming your payment… this page updates by itself.</p>
      ) : off ? (
        <p className="track__off">{order.status === 'REFUNDED' ? 'Your refund has been issued. It can take 5–10 business days to show on your statement.' : 'This order was cancelled.'} Questions? WhatsApp us on {site.whatsapp}.</p>
      ) : (
        <ol className="steps" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s.key} className={`step ${i < idx ? 'is-done' : ''} ${i === idx ? 'is-now' : ''}`}>
              <span className="step__dot" aria-hidden="true">{i < idx ? '✓' : i + 1}</span>
              <span className="step__label">{s.label}</span>
              {reached[s.key] && <span className="step__time">{time(reached[s.key])}</span>}
            </li>
          ))}
        </ol>
      )}

      <ul className="track__items">
        {order.items.map((i, n) => (
          <li key={n}>
            <span>{i.qty} × {i.name}{[i.variant, ...Object.values(i.options || {})].filter(Boolean).length ? <small> · {[i.variant, ...Object.values(i.options || {})].filter(Boolean).join(' · ')}</small> : null}</span>
            <span>{money(i.unitCents * i.qty)}</span>
          </li>
        ))}
        <li className="track__total"><span>Total paid <small>incl. GST</small></span><b>{money(order.totalCents)}</b></li>
      </ul>

      <div className="track__actions">
        <Button to="/menu" variant="ghost">Back to the menu</Button>
        <Button to={site.mapsUrl} variant="ghost">Directions</Button>
        <Button to={site.whatsappHref} variant="ghost">WhatsApp us</Button>
      </div>
      <p className="track__save">Bookmark this page — or use the link we sent to your email to check your order from any device.</p>
    </div>
  )
}

function OrderList() {
  const [list, setList] = useState(null)
  useEffect(() => {
    const local = getLocalOrders()
    Promise.all(local.map((o) => fetchOrder(o.token).then((d) => ({ ...o, ...d })).catch(() => ({ ...o, error: true })))).then((rows) => setList(rows.filter((r) => !r.notFound)))
  }, [])
  return (
    <div className="track__card">
      <header className="track__head">
        <span className="eyebrow">Order tracking</span>
        <h1 className="display track__title">My <span className="text-red">orders</span></h1>
        <p className="track__pickup">Orders placed from this device. Signed-in accounts arrive with the Rewards Club.</p>
      </header>
      {list === null ? (
        <div className="track__loading"><Flame /> Loading…</div>
      ) : list.length === 0 ? (
        <div className="track__missing">
          <p className="lead">No orders from this device yet. Your tracking link is also in your order email.</p>
          <Button to="/menu" variant="primary" icon={<Arrow />}>Order for pickup</Button>
        </div>
      ) : (
        <ul className="olist">
          {list.map((o) => (
            <li key={o.token}>
              <MoCoLink to={`/track/${o.token}`} className="olist__row">
                <span className="olist__num">#{o.number}</span>
                <span className="olist__when">{o.pickupAt ? formatPickup(o.pickupAt) : ''}</span>
                <span className={`olist__status olist__status--${(o.status || '').toLowerCase()}`}>{o.error ? 'Offline' : LABEL[o.status] || o.status}</span>
                <span className="olist__total">{o.totalCents != null ? money(o.totalCents) : ''}</span>
                <Arrow />
              </MoCoLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Track() {
  const { token } = useParams()
  return (
    <section className="track">
      <div className="container track__wrap">{token ? <OrderStatus token={token} /> : <OrderList />}</div>
    </section>
  )
}
