import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useCart, lineKey } from '../cart/CartProvider'
import { QtyStepper, lineExtras } from '../cart/CartDrawer'
import { saveLocalOrder } from '../cart/localOrders'
import { pickupDays } from '../data/ordering'
import { Button, Arrow, Flame } from '../components/ui'
import MoCoLink from '../motion/MoCoLink'
import DeliveryLinks from '../components/DeliveryLinks'

/* CHECKOUT — pickup only. Details → pickup time → pay online (Stripe). */
const SAVED = 'bgz-customer-v1'

export default function Order() {
  const { lines, ready, subtotal, setQty } = useCart()
  const { search } = useLocation()
  const cancelled = new URLSearchParams(search).has('cancelled')

  const [days, setDays] = useState([])
  const [day, setDay] = useState('')
  const [slot, setSlot] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' })
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState(null) // { message, field }
  const [busy, setBusy] = useState(false)

  // pickup slots + remembered details (client only, so the pre-rendered page stays identical)
  useEffect(() => {
    const d = pickupDays()
    setDays(d)
    if (d[0]) setDay(d[0].date)
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED) || 'null')
      if (saved) setForm((f) => ({ ...f, name: saved.name || '', email: saved.email || '', phone: saved.phone || '' }))
    } catch {
      /* ignore */
    }
  }, [])
  const slots = useMemo(() => days.find((d) => d.date === day)?.slots || [], [days, day])
  useEffect(() => {
    if (!slots.some((s) => s.iso === slot)) setSlot(slots[0]?.iso || '')
  }, [slots, slot])

  const clearErr = (k) =>
    setError((er) => {
      if (!er) return er
      if (er.fields?.includes(k)) {
        const rest = er.fields.filter((f) => f !== k)
        return rest.length ? { ...er, fields: rest } : null
      }
      return er.field?.endsWith(k) ? null : er
    })
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    clearErr(k)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const missing = []
    if (form.name.trim().length < 2) missing.push('name')
    if (!/^(\+?65)?[689]\d{7}$/.test(form.phone.replace(/[\s-]/g, ''))) missing.push('phone')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) missing.push('email')
    if (!agree) missing.push('agree')
    if (missing.length) {
      const only = missing.length === 1 && missing[0]
      const message =
        only === 'agree' ? 'Please accept the terms to continue.'
        : only === 'phone' ? 'Please enter a Singapore mobile number, e.g. 9123 4567.'
        : only === 'email' ? 'Please enter a valid email for your receipt.'
        : 'Please fill in the highlighted fields.'
      return setError({ message, fields: missing })
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map((l) => ({ itemId: l.itemId, qty: l.qty, variant: l.variant, options: l.options, notes: l.notes || undefined })),
          customer: { name: form.name, email: form.email, phone: form.phone },
          pickupAt: slot,
          notes: form.notes || undefined,
          agree: true,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError({ message: data.error || 'Something went wrong. Please try again.', field: data.field })
        if (data.field === 'pickupAt') {
          const d = pickupDays()
          setDays(d)
        }
        setBusy(false)
        return
      }
      try {
        localStorage.setItem(SAVED, JSON.stringify({ name: form.name, email: form.email, phone: form.phone }))
      } catch {
        /* ignore */
      }
      saveLocalOrder({ token: data.token, number: data.number })
      window.location.assign(data.url) // Stripe Checkout (or the tracking page in local dev)
    } catch {
      setError({ message: 'We couldn’t reach the server. Check your connection and try again.' })
      setBusy(false)
    }
  }

  // ---------- empty cart ----------
  if (ready && lines.length === 0) {
    return (
      <section className="checkout checkout--empty">
        <div className="container checkout__empty">
          <Flame />
          <span className="eyebrow">Order online · pickup</span>
          <h1 className="display checkout__title">Your cart is empty</h1>
          <p className="lead">Pick your favourites from the menu, then come back here to pay and choose a pickup time.</p>
          <Button to="/menu" variant="primary" icon={<Arrow />}>Browse the menu</Button>
          <DeliveryLinks />
        </div>
      </section>
    )
  }

  const err = (f) => error?.fields?.includes(f) || error?.field === f || error?.field?.endsWith(`.${f}`)

  return (
    <section className="checkout">
      <div className="container">
        <header className="checkout__head">
          <span className="eyebrow">Checkout · pickup only</span>
          <h1 className="display checkout__title">Almost <span className="text-red">grilled</span></h1>
          {cancelled && <p className="checkout__notice">Payment was cancelled. Your cart is still here whenever you’re ready.</p>}
        </header>

        <form className="checkout__grid" onSubmit={submit} noValidate>
          <div className="checkout__main">
            <fieldset className="cbox">
              <legend className="cbox__title"><span>01</span> Your details</legend>
              <div className="cbox__fields">
                <label className={`field ${err('name') ? 'field--err' : ''}`}><span>Name</span><input value={form.name} onChange={set('name')} autoComplete="name" required maxLength={80} /></label>
                <label className={`field ${err('phone') ? 'field--err' : ''}`}><span>Mobile (Singapore)</span><input value={form.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" placeholder="9123 4567" required /></label>
                <label className={`field field--wide ${err('email') ? 'field--err' : ''}`}><span>Email (for your receipt)</span><input type="email" value={form.email} onChange={set('email')} autoComplete="email" required /></label>
              </div>
            </fieldset>

            <fieldset className="cbox">
              <legend className="cbox__title"><span>02</span> Pickup time</legend>
              <p className="cbox__hint">Collect at <b>163 Rochor Road, Bugis Street</b>. Kitchen hours 11:30am – 10:30pm.</p>
              <div className="cbox__fields">
                <label className="field"><span>Day</span>
                  <select value={day} onChange={(e) => setDay(e.target.value)}>
                    {days.map((d) => <option key={d.date} value={d.date}>{d.label}</option>)}
                  </select>
                </label>
                <label className={`field ${err('pickupAt') ? 'field--err' : ''}`}><span>Time</span>
                  <select value={slot} onChange={(e) => setSlot(e.target.value)}>
                    {slots.map((s) => <option key={s.iso} value={s.iso}>{s.label}</option>)}
                  </select>
                </label>
                <label className="field field--wide"><span>Order notes (optional)</span><textarea rows="2" maxLength={300} value={form.notes} onChange={set('notes')} placeholder="Allergies, cutlery, anything we should know" /></label>
              </div>
            </fieldset>

            <DeliveryLinks />
          </div>

          <aside className="checkout__side">
            <div className="csum">
              <h2 className="cbox__title"><span>03</span> Your order</h2>
              <ul className="csum__lines">
                {lines.map((l) => (
                  <li key={lineKey(l)}>
                    <div>
                      <b>{l.name}</b>
                      {lineExtras(l) && <span>{lineExtras(l)}</span>}
                      {l.notes && <span>“{l.notes}”</span>}
                      <QtyStepper value={l.qty} onChange={(q) => setQty(lineKey(l), q)} />
                    </div>
                    <span className="csum__price">${(l.unitPrice * l.qty).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <MoCoLink to="/menu" className="csum__more">+ Add more</MoCoLink>
              <div className="csum__row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="csum__row"><span>Pickup</span><span>Free</span></div>
              <div className="csum__total"><span>Total <small>incl. GST</small></span><b>${subtotal.toFixed(2)}</b></div>

              <label className={`csum__agree ${err('agree') ? 'field--err' : ''}`}>
                <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); clearErr('agree') }} />
                <span>I agree to the <MoCoLink to="/terms">terms</MoCoLink> and <MoCoLink to="/privacy">privacy policy</MoCoLink>.</span>
              </label>

              {error && <p className="csum__error" role="alert">{error.message}</p>}

              <Button variant="primary" size="lg" type="submit" disabled={busy || !ready || !slot} className="csum__pay" icon={<Arrow />}>
                {busy ? 'Taking you to payment…' : `Pay $${subtotal.toFixed(2)}`}
              </Button>
              <p className="csum__secure">Secure payment by Stripe · cards, PayNow, Apple Pay &amp; Google Pay</p>
            </div>
          </aside>
        </form>
      </div>
    </section>
  )
}
