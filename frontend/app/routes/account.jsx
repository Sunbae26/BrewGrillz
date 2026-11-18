import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPatch, fieldError } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { isStaff } from "../lib/admin.js";
import { STATUS_LABEL } from "../lib/orders.js";
import { bookingDay, bookingTime } from "../lib/booking.js";
import { cents, formatPickup } from "../lib/format.js";
import { Button, Arrow, Flame } from "../components/ui/ui";
import { FormAlert, TextField } from "../components/auth/AuthShell";
import MoCoLink from "../motion/MoCoLink";

/* MY ACCOUNT — Rewards points, orders, table bookings and profile (signed-in customers). */

export const meta = () => [{ title: "My account | BrewGrillz" }, { name: "robots", content: "noindex" }];

const BOOKING_LABEL = { REQUESTED: "Requested", CONFIRMED: "Confirmed", DECLINED: "Not available", CANCELLED: "Cancelled", COMPLETED: "Enjoyed", NO_SHOW: "Missed" };
const ENTRY_LABEL = { EARN: "Earned", REDEEM: "Used", REVERSAL: "Reversed", ADJUSTMENT: "Added by our team" };
const TABS = [
  ["orders", "Orders"],
  ["bookings", "Bookings"],
  ["points", "Points"],
  ["profile", "Profile"],
];

export default function Account() {
  const navigate = useNavigate();
  const { user, loading, signOut, signOutOthers } = useAuth();
  const [tab, setTab] = useState("orders");

  useEffect(() => {
    if (!loading && !user) navigate("/login?next=/account", { replace: true });
  }, [loading, user, navigate]);

  const signedIn = Boolean(user);
  const orders = useQuery({ queryKey: ["account", "orders"], queryFn: ({ signal }) => apiGet("/account/orders", { signal }), enabled: signedIn });
  const bookings = useQuery({ queryKey: ["account", "bookings"], queryFn: ({ signal }) => apiGet("/account/bookings", { signal }), enabled: signedIn });
  const points = useQuery({ queryKey: ["account", "points"], queryFn: ({ signal }) => apiGet("/account/points", { signal }), enabled: signedIn });

  if (loading || !user)
    return <section className="acct"><div className="container acct__loading"><Flame /> Loading your account…</div></section>;

  const balance = points.data?.balance ?? user.points?.balance ?? 0;
  const rules = user.points;
  const worth = Math.floor(balance / rules.redeemBlock) * rules.redeemValueCents;
  const toNext = rules.redeemBlock - (balance % rules.redeemBlock);

  return (
    <section className="acct">
      <div className="container">
        <header className="acct__head">
          <div>
            <span className="eyebrow">My account</span>
            <h1 className="display acct__title">Hey, <span className="text-red">{user.name.split(" ")[0]}!</span></h1>
          </div>
          <div className="acct__head-actions">
            {isStaff(user) && <Button to="/admin" variant="ghost">Open dashboard</Button>}
            <Button variant="ghost" onClick={async () => { await signOut(); navigate("/"); }}>Sign out</Button>
          </div>
        </header>

        <div className="acct__grid">
          <aside className="rcard rcard--member" aria-label="Your Rewards card">
            <div className="rcard__top">
              <span className="rcard__brand">BREW<b>GRILLZ</b></span>
              <Flame className="rcard__flame" />
            </div>
            <span className="rcard__label">Rewards balance</span>
            <b className="rcard__points">{balance.toLocaleString("en-SG")} <small>pts</small></b>
            <span className="rcard__deal">
              {worth > 0 ? `Worth ${cents(worth)} off your next pickup order` : `${toNext} more points to your first ${cents(rules.redeemValueCents)} off`}
            </span>
            <div className="rcard__bar"><span style={{ width: `${((balance % rules.redeemBlock) / rules.redeemBlock) * 100}%` }} /></div>
            <span className="rcard__name">{user.name}</span>
            <p className="rcard__tip">Eating in? Give our team your email or mobile when you pay and we’ll add your points.</p>
          </aside>

          <div className="acct__main">
            <div className="acct__tabs" role="tablist">
              {TABS.map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} className={`acct__tab ${tab === key ? "is-on" : ""}`} onClick={() => setTab(key)}>
                  {label}
                </button>
              ))}
            </div>

            {tab === "orders" && (
              <List
                query={orders}
                empty={<>No orders yet. <MoCoLink to="/menu">Order for pickup</MoCoLink> and earn points on every dollar.</>}
                render={(o) => (
                  <MoCoLink key={o.code} to={`/order/${o.code}?t=${o.token}`} className="acct__row">
                    <span className="acct__code">{o.code}</span>
                    <span className="acct__when">{formatPickup(o.pickupAt)}</span>
                    <span className={`olist__status olist__status--${o.status.toLowerCase()}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
                    <span className="acct__total">{cents(o.totalCents)}</span>
                    <Arrow />
                  </MoCoLink>
                )}
              />
            )}

            {tab === "bookings" && (
              <List
                query={bookings}
                empty={<>No bookings yet. <MoCoLink to="/reserve">Book a table</MoCoLink> while signed in and it shows up here.</>}
                render={(b) => (
                  <MoCoLink key={b.code} to={`/reserve/${b.code}?t=${b.token}`} className="acct__row">
                    <span className="acct__code">{b.code}</span>
                    <span className="acct__when">{bookingDay(b.startsAt)}, {bookingTime(b.startsAt)} · {b.partySize} guests</span>
                    <span className={`olist__status olist__status--${b.status.toLowerCase()}`}>{BOOKING_LABEL[b.status]}</span>
                    <span />
                    <Arrow />
                  </MoCoLink>
                )}
              />
            )}

            {tab === "points" && (
              <div className="acct__panel">
                <p className="acct__rules">
                  Earn <b>{rules.pointsPerDollar} point</b> for every S$1. Use <b>{rules.redeemBlock} points</b> for <b>{cents(rules.redeemValueCents)} off</b> a pickup order at checkout.
                </p>
                <List
                  query={{ ...points, data: points.data?.entries }}
                  empty="No points yet. They’ll show here after your first order or dine-in bill."
                  render={(e, i) => (
                    <div key={i} className="acct__row acct__row--static">
                      <span className="acct__when">{new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(e.createdAt))}</span>
                      <span>{e.note || ENTRY_LABEL[e.type]}{e.orderCode && !(e.note ?? "").includes(e.orderCode) ? ` ${e.orderCode}` : ""}</span>
                      <span />
                      <b className={e.points > 0 ? "acct__plus" : "acct__minus"}>{e.points > 0 ? "+" : ""}{e.points}</b>
                      <span />
                    </div>
                  )}
                />
              </div>
            )}

            {tab === "profile" && <Profile user={user} onSignOutOthers={signOutOthers} />}
          </div>
        </div>
      </div>
    </section>
  );
}

function List({ query, empty, render }) {
  if (query.isLoading) return <p className="acct__empty"><Flame /> Loading…</p>;
  if (query.isError) return <FormAlert>We couldn’t load this. Refresh the page to try again.</FormAlert>;
  if (!query.data?.length) return <p className="acct__empty">{empty}</p>;
  return <div className="acct__list">{query.data.map(render)}</div>;
}

function Profile({ user, onSignOutOthers }) {
  const { setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, phone: user.phone ?? "" });
  const [whatsapp, setWhatsapp] = useState(user.whatsappOptIn);
  const [state, setState] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    setState({ busy: true });
    try {
      setUser(await apiPatch("/account/profile", { name: form.name, phone: form.phone.trim() || undefined, whatsapp }));
      setState({ saved: true });
    } catch (error) {
      setState({ error });
    }
  };

  return (
    <form className="acct__panel cbox" onSubmit={save} noValidate>
      <div className="cbox__fields">
        <TextField id="name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={fieldError(state?.error, "name")} />
        <TextField id="phone" label="Mobile" inputMode="tel" placeholder="9123 4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={fieldError(state?.error, "phone")} />
      </div>
      <p className="cbox__hint">Email: <b>{user.email}</b></p>
      {form.phone.trim() && (
        <label className="csum__agree cbox__opt">
          <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} />
          <span>Send my order and booking updates on WhatsApp</span>
        </label>
      )}
      {state?.error && !state.error.details && <FormAlert>{state.error.message}</FormAlert>}
      {state?.saved && <FormAlert tone="info">Saved.</FormAlert>}
      <div className="track__actions">
        <Button variant="primary" type="submit" disabled={state?.busy}>Save changes</Button>
        <Button to="/forgot-password" variant="ghost">Change password</Button>
        <Button variant="ghost" onClick={async () => { await onSignOutOthers(); setState({ saved: true }); }}>Sign out other devices</Button>
      </div>
    </form>
  );
}
