import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCart, lineKey, lineExtras, MAX_QTY } from "../lib/cart.jsx";
import { usePickupSlots, queryKeys } from "../lib/queries.js";
import { apiPost } from "../lib/api.js";
import { saveLocalOrder } from "../lib/localOrders.js";
import { useAuth, ME_KEY } from "../lib/auth.jsx";
import { Button, Arrow, Flame } from "../components/ui/ui";
import QtyStepper from "../components/ui/QtyStepper";
import TrashIcon from "../components/ui/TrashIcon";
import MoCoLink from "../motion/MoCoLink";
import DeliveryLinks from "../components/ui/DeliveryLinks";
import { DayRibbon, LoadingNote, TimeGrid } from "../components/ui/Pickers";

/* CHECKOUT — pickup only. Details → pickup time → pay online (Stripe, or instantly in test mode). */
const SAVED = "bgz-customer-v1";
const ATTEMPT = "bgz-checkout-attempt";

export const meta = () => [{ title: "Checkout | BrewGrillz Singapore" }, { name: "robots", content: "noindex" }];

// One idempotency key per "version" of the order: pressing Pay twice never creates two orders,
// but changing the cart or pickup time starts a fresh one.
function attemptKey(fingerprint) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(ATTEMPT) || "null");
    if (saved?.fingerprint === fingerprint) return saved.key;
    const key = crypto.randomUUID();
    sessionStorage.setItem(ATTEMPT, JSON.stringify({ fingerprint, key }));
    return key;
  } catch {
    return crypto.randomUUID();
  }
}

const MIN_ONLINE_CENTS = 50;
const validPhone = (value) => /^(\+?65)?[3689]\d{7}$/.test(value.replace(/[\s-]/g, ""));
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export default function Checkout() {
  const { lines, ready, subtotal, soldOut, setQty } = useCart();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cancelled = params.get("cancelled");
  const cancelledToken = params.get("t");
  const { data: days = [], isLoading: slotsLoading, isError: slotsError, refetch: refetchSlots } = usePickupSlots();

  const [day, setDay] = useState("");
  const [slot, setSlot] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [whatsapp, setWhatsapp] = useState(true);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState(null); // { message, fields: [] }
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const [blocks, setBlocks] = useState(0);

  // Rewards points: whole blocks only, and at least $0.50 is always paid online
  const rules = user?.points;
  const subtotalCents = Math.round(subtotal * 100);
  const maxBlocks = rules
    ? Math.max(0, Math.min(Math.floor(rules.balance / rules.redeemBlock), Math.floor((subtotalCents - MIN_ONLINE_CENTS) / rules.redeemValueCents)))
    : 0;
  const usedBlocks = Math.min(blocks, maxBlocks);
  const discountCents = rules ? usedBlocks * rules.redeemValueCents : 0;
  const pointsToRedeem = rules ? usedBlocks * rules.redeemBlock : 0;
  const totalDue = (subtotalCents - discountCents) / 100;
  const earns = rules ? Math.floor(totalDue * rules.pointsPerDollar) : Math.floor(subtotal);

  // remembered details (client only, so the pre-built page matches)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED) || "null");
      if (saved) setForm((f) => ({ ...f, name: saved.name || "", email: saved.email || "", phone: saved.phone || "" }));
    } catch {
      /* ignore */
    }
  }, []);

  // signed in: fill in the account's details (they can still be changed for this order)
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({ ...f, name: f.name || user.name, email: user.email, phone: f.phone || user.phone || "" }));
  }, [user]);

  useEffect(() => {
    if (days.length && !days.some((d) => d.date === day)) setDay(days[0].date);
  }, [days, day]);
  const slots = useMemo(() => days.find((d) => d.date === day)?.slots || [], [days, day]);
  useEffect(() => {
    if (!slots.some((s) => s.iso === slot)) setSlot(slots[0]?.iso || "");
  }, [slots, slot]);

  const clearErr = (k) =>
    setError((er) => {
      if (!er?.fields?.includes(k)) return er;
      const rest = er.fields.filter((f) => f !== k);
      return rest.length ? { ...er, fields: rest } : null;
    });
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    clearErr(k);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const missing = [];
    if (form.name.trim().length < 2) missing.push("name");
    if (!validPhone(form.phone)) missing.push("phone");
    if (!validEmail(form.email)) missing.push("email");
    if (!slot) missing.push("pickupAt");
    if (!agree) missing.push("agree");
    if (missing.length) {
      const only = missing.length === 1 && missing[0];
      const message =
        only === "agree" ? "Please accept the terms to continue."
        : only === "phone" ? "Please enter a Singapore mobile number, e.g. 9123 4567."
        : only === "email" ? "Please enter a valid email for your receipt."
        : only === "pickupAt" ? "Please choose a pickup time."
        : "Please fill in the highlighted fields.";
      return setError({ message, fields: missing });
    }
    if (soldOut.length) return setError({ message: "Please remove the sold-out items first.", fields: [] });

    const items = lines.map((l) => ({
      slug: l.slug,
      quantity: l.qty,
      ...(l.variant ? { variant: l.variant } : {}),
      ...(Object.keys(l.options || {}).length ? { options: l.options } : {}),
      ...(l.notes ? { notes: l.notes } : {}),
    }));
    const fingerprint = JSON.stringify({ items, slot, pointsToRedeem });
    setBusy(true);
    setError(null);
    try {
      const { order, payment } = await apiPost("/orders", {
        idempotencyKey: attemptKey(fingerprint),
        items,
        customer: { name: form.name, email: form.email, phone: form.phone, whatsapp },
        pickupAt: slot,
        ...(pointsToRedeem ? { pointsToRedeem } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        agree: true,
        ...(cancelled && cancelledToken ? { replaces: { code: cancelled, token: cancelledToken } } : {}),
      });
      try {
        localStorage.setItem(SAVED, JSON.stringify({ name: form.name, email: form.email, phone: form.phone }));
      } catch {
        /* ignore */
      }
      saveLocalOrder({ code: order.code, token: order.token });
      if (user) queryClient.invalidateQueries({ queryKey: ME_KEY });
      const orderPage = `/order/${order.code}?t=${order.token}&paid=1`;
      if (payment.url) return window.location.assign(payment.url); // Stripe Checkout
      if (payment.provider === "test" && !payment.alreadyPaid)
        await apiPost(`/orders/${order.code}/confirm?t=${order.token}`, {});
      sessionStorage.removeItem(ATTEMPT);
      navigate(orderPage);
    } catch (err) {
      const code = err.details?.code;
      if (code === "REPLACED_ORDER_PAID" || code === "REPLACED_ORDER_PROCESSING")
        return navigate(`/order/${err.details.order}?t=${err.details.token}`);
      if (code === "SLOT_UNAVAILABLE" || code === "SLOT_FULL") refetchSlots();
      if (["SOLD_OUT", "DINE_IN_ONLY", "UNKNOWN_ITEM"].includes(code)) queryClient.invalidateQueries({ queryKey: queryKeys.menu });
      if (code === "ORDER_EXPIRED" || code === "ORDER_CHANGED") sessionStorage.removeItem(ATTEMPT);
      const fields = err.details && !code ? Object.keys(err.details) : [];
      setError({
        message: err.status ? err.message : "We couldn’t reach the server. Check your connection and try again.",
        fields: fields.includes("customer") ? ["name", "phone", "email"] : fields,
      });
      setBusy(false);
    }
  };

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
    );
  }

  const err = (f) => error?.fields?.includes(f);

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
                <label className={`field ${err("name") ? "field--err" : ""}`}><span>Name</span><input value={form.name} onChange={set("name")} autoComplete="name" required maxLength={80} /></label>
                <label className={`field ${err("phone") ? "field--err" : ""}`}><span>Mobile (Singapore)</span><input value={form.phone} onChange={set("phone")} autoComplete="tel" inputMode="tel" placeholder="9123 4567" required maxLength={20} /></label>
                <label className={`field field--wide ${err("email") ? "field--err" : ""}`}><span>Email (for your receipt)</span><input type="email" value={form.email} onChange={set("email")} autoComplete="email" required maxLength={120} /></label>
              </div>
              <label className="csum__agree cbox__opt">
                <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} />
                <span>Send me order updates on WhatsApp</span>
              </label>
            </fieldset>

            <fieldset className="cbox">
              <legend className="cbox__title"><span>02</span> Pickup time</legend>
              <p className="cbox__hint">Collect at <b>163 Rochor Road, Bugis Street</b>. Kitchen hours 11:30am – 10:30pm.</p>
              {slotsError ? (
                <p className="csum__error">We couldn’t load pickup times. <button type="button" className="linkish" onClick={() => refetchSlots()}>Try again</button></p>
              ) : !slotsLoading && days.length === 0 ? (
                <p className="checkout__notice">No pickup times are left right now. Please try again later, or call us on +65 6312 2847.</p>
              ) : (
                <>
                  <LoadingNote loading={slotsLoading} />
                  <div className="book__label">Day</div>
                  <DayRibbon days={days} value={day} onChange={setDay} loading={slotsLoading} label="Choose a pickup day" />
                  <div className={`book__label ${err("pickupAt") ? "book__label--err" : ""}`}>Time {err("pickupAt") && <em>· choose one</em>}</div>
                  <TimeGrid
                    times={slots}
                    value={slot}
                    onChange={(iso) => { setSlot(iso); clearErr("pickupAt"); }}
                    loading={slotsLoading}
                    grouped
                    label="Choose a pickup time"
                  />
                  <div className="cbox__fields pick__notes">
                    <label className="field field--wide"><span>Order notes (optional)</span><textarea rows="2" maxLength={300} value={form.notes} onChange={set("notes")} placeholder="Allergies, cutlery, anything we should know" /></label>
                  </div>
                </>
              )}
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
                      {l.available === false && <em className="cline__sold">Sold out · please remove</em>}
                      <QtyStepper value={l.qty} max={MAX_QTY} onChange={(q) => setQty(lineKey(l), q)} />
                    </div>
                    <div className="cline__side">
                      <span className="csum__price">${(l.unitPrice * l.qty).toFixed(2)}</span>
                      <button type="button" className="cline__del" onClick={() => setQty(lineKey(l), 0)} aria-label={`Remove ${l.name}`} title="Remove"><TrashIcon /></button>
                    </div>
                  </li>
                ))}
              </ul>
              <MoCoLink to="/menu" className="csum__more">+ Add more</MoCoLink>
              <div className="csum__row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="csum__row"><span>Pickup</span><span>Free</span></div>
              {discountCents > 0 && <div className="csum__row csum__row--off"><span>Rewards ({pointsToRedeem} pts)</span><span>−${(discountCents / 100).toFixed(2)}</span></div>}
              <div className="csum__total"><span>Total <small>incl. GST</small></span><b>${totalDue.toFixed(2)}</b></div>

              {user && rules ? (
                <div className="cpts">
                  <div className="cpts__top">
                    <span><b>{rules.balance}</b> points</span>
                    {maxBlocks > 0 ? (
                      <div className="cpts__step" role="group" aria-label="Points to use">
                        <button type="button" onClick={() => setBlocks(Math.max(0, usedBlocks - 1))} disabled={usedBlocks === 0} aria-label="Use fewer points">−</button>
                        <span>{pointsToRedeem} pts</span>
                        <button type="button" onClick={() => setBlocks(Math.min(maxBlocks, usedBlocks + 1))} disabled={usedBlocks >= maxBlocks} aria-label="Use more points">+</button>
                      </div>
                    ) : (
                      <small>{rules.redeemBlock - (rules.balance % rules.redeemBlock)} more to unlock ${(rules.redeemValueCents / 100).toFixed(0)} off</small>
                    )}
                  </div>
                  <p className="cpts__earn">You’ll earn <b>{earns} points</b> on this order.</p>
                </div>
              ) : (
                <p className="cpts cpts--guest">
                  <MoCoLink to="/login?next=/checkout">Sign in</MoCoLink> or <MoCoLink to="/register?next=/checkout">join free</MoCoLink> to earn <b>{earns} points</b> on this order.
                </p>
              )}

              <label className={`csum__agree ${err("agree") ? "field--err" : ""}`}>
                <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); clearErr("agree"); }} />
                <span>I agree to the <MoCoLink to="/terms">terms</MoCoLink> and <MoCoLink to="/privacy">privacy policy</MoCoLink>.</span>
              </label>

              {error && <p className="csum__error" role="alert">{error.message}</p>}

              <Button variant="primary" size="lg" type="submit" disabled={busy || !ready || slotsLoading || soldOut.length > 0} className="csum__pay" icon={<Arrow />}>
                {busy ? "Taking you to payment…" : `Pay $${totalDue.toFixed(2)}`}
              </Button>
              <p className="csum__secure">Secure payment by Stripe · cards, PayNow, Apple Pay &amp; Google Pay</p>
            </div>
          </aside>
        </form>
      </div>
    </section>
  );
}
