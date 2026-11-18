import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getLocalOrders } from "../lib/localOrders.js";
import { apiPost } from "../lib/api.js";
import { Button, Arrow } from "../components/ui/ui";
import MoCoLink from "../motion/MoCoLink";
import { site } from "../config/site";
import { seo } from "../lib/seo.js";

/* TRACK YOUR ORDER — guests enter their order number + email (same as Ruchi). */

export const meta = () =>
  seo({
    title: "Track your order | BrewGrillz Singapore",
    description: "Follow your BrewGrillz pickup order live with your order number and email.",
    path: "/track",
    noIndex: true,
  });

const ORDER_CODE = /^BG-\d{6}-[A-Z2-9]{4}$/;

export default function Track() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState([]);

  useEffect(() => setRecent(getLocalOrders()), []);

  const submit = async (e) => {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (!ORDER_CODE.test(cleaned)) return setError("Enter your order number as it appears in your confirmation email, like BG-261117-AB2C.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError("Enter the email you used when you ordered.");
    setBusy(true);
    setError("");
    try {
      const found = await apiPost("/orders/find", { code: cleaned, email: email.trim() });
      navigate(`/order/${found.code}?t=${found.token}`);
    } catch (err) {
      setError(err.status ? err.message : "We couldn’t reach the server. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <section className="track">
      <div className="container track__wrap track__wrap--wide">
        <header className="track__head">
          <span className="eyebrow">Order tracking</span>
          <h1 className="display track__title">Track your <span className="text-red">order</span></h1>
          <p className="lead">Ordered as a guest? Enter your order number and the email you used, and we’ll show you its live status.</p>
          <p className="track__acct">Have an account? <MoCoLink to="/account">Your orders are in your account</MoCoLink>.</p>
        </header>

        <div className="tfind">
          <form className="cbox tfind__form" onSubmit={submit} noValidate>
            <div className="cbox__fields tfind__fields">
              <label className="field field--wide">
                <span>Order number</span>
                <input value={code} onChange={(e) => { setCode(e.target.value); setError(""); }} placeholder="BG-261117-AB2C" autoComplete="off" autoCapitalize="characters" maxLength={20} />
                <small className="field__hint">It’s in your confirmation email.</small>
              </label>
              <label className="field field--wide">
                <span>Email</span>
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} autoComplete="email" maxLength={120} />
              </label>
            </div>
            {error && <p className="csum__error" role="alert">{error}</p>}
            <Button variant="primary" size="lg" type="submit" disabled={busy || !code || !email} className="tfind__submit" icon={<Arrow />}>
              {busy ? "Finding your order…" : "Track order"}
            </Button>
            <p className="tfind__help">Can’t find your order number? Call us on <a href={site.phoneHref}>{site.phone}</a> or WhatsApp <a href={site.whatsappHref} target="_blank" rel="noreferrer">{site.whatsapp}</a>.</p>
          </form>

          <aside className="cbox tfind__recent">
            <h2 className="cbox__title">On this device</h2>
            {recent.length ? (
              <ul className="tfind__list">
                {recent.map((o) => (
                  <li key={o.code}>
                    <MoCoLink to={`/order/${o.code}?t=${o.token}`} className="tfind__row">
                      <span>{o.code}</span>
                      <Arrow />
                    </MoCoLink>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cbox__hint">Orders you place on this phone or computer show up here, so you can get back to them in one tap.</p>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
