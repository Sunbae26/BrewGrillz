import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { DayRibbon, LoadingNote, TimeGrid } from "../components/ui/Pickers";
import { apiGet, apiPost } from "../lib/api.js";
import { bookingDay, bookingTime, getLocalBookings, saveLocalBooking } from "../lib/booking.js";
import PageHero from "../components/ui/PageHero";
import QtyStepper from "../components/ui/QtyStepper";
import { Button, Arrow, Flame } from "../components/ui/ui";
import MoCoLink from "../motion/MoCoLink";
import { img } from "../config/home";
import { site } from "../config/site";
import { seo } from "../lib/seo.js";

/* BOOK A TABLE — pick a day, party size and time; we hold a table straight away and staff confirm it. */

export const meta = () =>
  seo({
    title: "Book a Table | BrewGrillz Singapore — Grill & Bar in Bugis",
    description: "Book a table at BrewGrillz, 163 Rochor Road, Bugis. Steaks, platters, pizza and Brewerkz craft beer. Groups up to 10 online; bigger parties, send us an event enquiry.",
    path: "/reserve",
  });

const OCCASIONS = ["Birthday", "Anniversary", "Date night", "Business", "Celebration", "Other"];
const ATTEMPT = "bgz-booking-attempt";

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

const validPhone = (value) => /^(\+?65)?[3689]\d{7}$/.test(value.replace(/[\s-]/g, ""));
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export default function Reserve() {
  const navigate = useNavigate();
  const { data: rules } = useQuery({ queryKey: ["booking-rules"], queryFn: () => apiGet("/reservations/rules"), staleTime: Infinity });
  const { data: days = [], isPending: loadingDays } = useQuery({ queryKey: ["booking-days"], queryFn: () => apiGet("/reservations/days"), staleTime: 300_000 });
  const maxParty = rules?.maxParty ?? 10;

  const [date, setDate] = useState("");
  const [party, setParty] = useState(2);
  const [time, setTime] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [occasion, setOccasion] = useState("");
  const [whatsapp, setWhatsapp] = useState(true);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState([]);

  useEffect(() => {
    setMine(getLocalBookings());
    try {
      const saved = JSON.parse(localStorage.getItem("bgz-customer-v1") || "null");
      if (saved) setForm((f) => ({ ...f, name: saved.name || "", email: saved.email || "", phone: saved.phone || "" }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!date && days.length) setDate(days.find((d) => !d.closed)?.date ?? "");
  }, [days, date]);

  const { data: day, isFetching: loadingTimes, refetch: refetchTimes } = useQuery({
    queryKey: ["booking-availability", date],
    queryFn: ({ signal }) => apiGet(`/reservations/availability?date=${date}`, { signal }),
    enabled: Boolean(date),
    refetchInterval: 60_000,
  });
  const times = useMemo(() => day?.times ?? [], [day]);
  useEffect(() => {
    if (time && !times.some((t) => t.iso === time && t.available)) setTime("");
  }, [times, time]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setError((er) => (er?.fields?.includes(k) ? { ...er, fields: er.fields.filter((f) => f !== k) } : er));
  };
  const err = (f) => error?.fields?.includes(f);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const missing = [];
    if (!time) missing.push("time");
    if (form.name.trim().length < 2) missing.push("name");
    if (!validPhone(form.phone)) missing.push("phone");
    if (!validEmail(form.email)) missing.push("email");
    if (!agree) missing.push("agree");
    if (missing.length)
      return setError({
        message: missing.includes("time") && missing.length === 1 ? "Choose a time for your table." : missing.length === 1 && missing[0] === "agree" ? "Please accept the booking terms to continue." : "Please fill in the highlighted fields.",
        fields: missing,
      });
    const body = {
      startsAt: time,
      partySize: party,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      whatsapp,
      ...(occasion ? { occasion } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      agree: true,
    };
    setBusy(true);
    setError(null);
    try {
      const made = await apiPost("/reservations", { idempotencyKey: attemptKey(JSON.stringify(body)), ...body });
      saveLocalBooking(made);
      sessionStorage.removeItem(ATTEMPT);
      try {
        localStorage.setItem("bgz-customer-v1", JSON.stringify({ name: body.name, email: body.email, phone: body.phone }));
      } catch {
        /* ignore */
      }
      navigate(`/reserve/${made.code}?t=${made.token}&new=1`);
    } catch (failure) {
      const code = failure.details?.code;
      if (code === "FULLY_BOOKED" || code === "TIME_UNAVAILABLE") {
        refetchTimes();
        setTime("");
      }
      setError({
        message: failure.status ? failure.message : "We couldn’t reach the server. Check your connection and try again.",
        fields: code === "FULLY_BOOKED" || code === "TIME_UNAVAILABLE" ? ["time"] : failure.details && !code ? Object.keys(failure.details) : [],
      });
      setBusy(false);
    }
  };

  const chosen = times.find((t) => t.iso === time);

  return (
    <div className="reserve-page">
      <PageHero eyebrow="Book a table" title="Grab a" accent="seat." script="pull up, partner" image={img("sirloin")}>
        <p className="lead">Steaks on the grill, Brewerkz on tap and a table with your name on it. Tell us when, and we’ll hold it straight away.</p>
        <ul className="phero__pills">
          <li>Open daily 10am – 11pm</li>
          <li>Up to {maxParty} guests online</li>
          <li>Confirmed in about 15 min</li>
        </ul>
      </PageHero>

      <section className="section book">
        <form className="container book__grid" onSubmit={submit} noValidate>
          <div className="book__main">
            <fieldset className="cbox">
              <legend className="cbox__title"><span>01</span> When</legend>

              <LoadingNote loading={loadingDays || (loadingTimes && !times.length)} />
              <div className="book__label">Day</div>
              <DayRibbon days={days} value={date} onChange={(d) => { setDate(d); setTime(""); }} loading={loadingDays} />

              <div className="book__row">
                <div>
                  <div className="book__label">Guests</div>
                  <QtyStepper value={party} min={1} max={maxParty} onChange={(n) => setParty(Math.max(1, Math.min(maxParty, n)))} label="Number of guests" />
                </div>
                <p className="book__big">More than {maxParty}? <MoCoLink to="/events">Plan a party with us →</MoCoLink></p>
              </div>

              <div className={`book__label ${err("time") ? "book__label--err" : ""}`}>Time {err("time") && <em>· choose one</em>}</div>
              {day?.closed ? (
                <p className="checkout__notice">We’re closed on this day. Please choose another.</p>
              ) : times.length === 0 && !loadingTimes && date ? (
                <p className="checkout__notice">No more times today. Try tomorrow, or call us on {site.phone}.</p>
              ) : (
                <TimeGrid times={times} value={time} onChange={(iso) => { setTime(iso); setError(null); }} loading={!date || (loadingTimes && !times.length)} />
              )}
            </fieldset>

            <fieldset className="cbox">
              <legend className="cbox__title"><span>02</span> Your details</legend>
              <div className="cbox__fields">
                <label className={`field ${err("name") ? "field--err" : ""}`}><span>Name</span><input value={form.name} onChange={set("name")} autoComplete="name" maxLength={80} /></label>
                <label className={`field ${err("phone") ? "field--err" : ""}`}><span>Mobile (Singapore)</span><input value={form.phone} onChange={set("phone")} autoComplete="tel" inputMode="tel" placeholder="9123 4567" maxLength={20} /></label>
                <label className={`field field--wide ${err("email") ? "field--err" : ""}`}><span>Email</span><input type="email" value={form.email} onChange={set("email")} autoComplete="email" maxLength={120} /></label>
              </div>
              <div className="book__label">Celebrating something? (optional)</div>
              <div className="chips">
                {OCCASIONS.map((o) => (
                  <button key={o} type="button" className={`chip ${occasion === o ? "is-on" : ""}`} onClick={() => setOccasion(occasion === o ? "" : o)}>{o}</button>
                ))}
              </div>
              <div className="cbox__fields">
                <label className="field field--wide"><span>Anything we should know? (optional)</span><textarea rows="2" maxLength={300} value={form.notes} onChange={set("notes")} placeholder="High chair, allergies, a table near the bar…" /></label>
              </div>
              <label className="csum__agree cbox__opt">
                <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} />
                <span>Send me booking updates on WhatsApp</span>
              </label>
            </fieldset>
          </div>

          <aside className="book__side">
            <div className="placecard" aria-live="polite">
              <span className="placecard__fold" aria-hidden="true" />
              <span className="placecard__eyebrow">Reserved for</span>
              <b className="placecard__name">{form.name.trim() || "You & your crew"}</b>
              <div className="placecard__rows">
                <div><span>Day</span><b>{date ? bookingDay(`${date}T12:00:00+08:00`) : "—"}</b></div>
                <div><span>Time</span><b>{chosen ? bookingTime(chosen.iso) : "Pick a time"}</b></div>
                <div><span>Guests</span><b>{party}</b></div>
              </div>
              <div className="placecard__seats" aria-hidden="true">
                {Array.from({ length: party }, (_, i) => <span key={i} />)}
              </div>
              <Flame className="placecard__flame" />
            </div>

            <label className={`csum__agree ${err("agree") ? "field--err" : ""}`}>
              <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setError(null); }} />
              <span>I agree to the <MoCoLink to="/terms">booking terms</MoCoLink> and <MoCoLink to="/privacy">privacy policy</MoCoLink>. We hold tables for 15 minutes after the booking time.</span>
            </label>
            {error && <p className="csum__error" role="alert">{error.message}</p>}
            <Button variant="primary" size="lg" type="submit" disabled={busy} className="csum__pay" icon={<Arrow />}>
              {busy ? "Saving your table…" : "Request my table"}
            </Button>
            <p className="csum__secure">Free to book · we’ll email you when it’s confirmed</p>

            {mine.length > 0 && (
              <div className="book__mine">
                <span className="book__label">Your bookings on this device</span>
                {mine.map((b) => (
                  <MoCoLink key={b.code} to={`/reserve/${b.code}?t=${b.token}`} className="tfind__row"><span>{b.code}</span><Arrow /></MoCoLink>
                ))}
              </div>
            )}
          </aside>
        </form>
      </section>
    </div>
  );
}
