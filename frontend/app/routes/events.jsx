import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "../lib/api.js";
import { useReveals } from "../motion/effects";
import PageHero from "../components/ui/PageHero";
import QtyStepper from "../components/ui/QtyStepper";
import { Button, Arrow, Flame, Food, Sticker, SectionHead } from "../components/ui/ui";
import MoCoLink from "../motion/MoCoLink";
import { img, place } from "../config/home";
import { site } from "../config/site";
import { seo } from "../lib/seo.js";

/* EVENTS & PARTIES — what we host, how it works, and an enquiry form (nothing is charged until confirmed). */

export const meta = () =>
  seo({
    title: "Events & Parties | BrewGrillz Singapore — Birthdays, Office Parties in Bugis",
    description: "Celebrate at BrewGrillz, 163 Rochor Road, Bugis: birthdays, office parties, farewells and watch parties with sharing platters, Brewerkz craft beer and cocktails. Send an enquiry and we'll plan it with you.",
    path: "/events",
  });

const OCCASIONS = [
  { name: "Birthday", line: "Cake on us? Ask. Candles, playlists and a platter with your name on it.", image: img("mixed-grill-platter"), sticker: "Party!" },
  { name: "Office party", line: "Team dinners, launches and Friday wins, with a bar that keeps up.", image: img("meat-platter"), sticker: "Team" },
  { name: "Watch party", line: "Big games, cold buckets of five and wings by the dozen.", image: img("chicken-wings"), sticker: "Game on" },
  { name: "Farewell", line: "Send them off properly. Long tables, loud toasts.", image: img("honey-garlic-pizza"), sticker: "Cheers" },
];

const STEPS = [
  { n: "01", title: "Tell us the plan", text: "Date, guests and the vibe. Takes a minute." },
  { n: "02", title: "We send ideas", text: "Menus, platters, drinks and prices, within one working day." },
  { n: "03", title: "Lock it in", text: "Happy with it? We confirm and get the grill ready. Nothing is charged before that." },
];

const TIMES = Array.from({ length: 22 }, (_, i) => {
  const minutes = 11 * 60 + i * 30;
  const value = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const h = Math.floor(minutes / 60);
  return { value, label: `${((h + 11) % 12) + 1}:${String(minutes % 60).padStart(2, "0")} ${h < 12 ? "am" : "pm"}` };
});

const sgToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date(Date.now() + 86_400_000 * 2));

export default function Events() {
  const root = useRef(null);
  useReveals(root);
  const { data: rules } = useQuery({ queryKey: ["enquiry-rules"], queryFn: () => apiGet("/enquiries/rules"), staleTime: Infinity });
  const occasions = rules?.occasions ?? ["Birthday", "Office party", "Anniversary", "Farewell", "Watch party", "Private dining", "Other"];

  const [form, setForm] = useState({ occasion: "Birthday", eventDate: "", startTime: "19:00", budget: "", name: "", phone: "", email: "", message: "" });
  const [guests, setGuests] = useState(20);
  const [wholeVenue, setWholeVenue] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const [minDate, setMinDate] = useState("");

  useEffect(() => {
    setMinDate(sgToday());
    try {
      const saved = JSON.parse(localStorage.getItem("bgz-customer-v1") || "null");
      if (saved) setForm((f) => ({ ...f, name: saved.name || "", email: saved.email || "", phone: saved.phone || "" }));
    } catch {
      /* ignore */
    }
  }, []);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setError((er) => (er?.fields?.includes(k) ? { ...er, fields: er.fields.filter((f) => f !== k) } : er));
  };
  const err = (f) => error?.fields?.includes(f);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const missing = [];
    if (!form.eventDate) missing.push("eventDate");
    if (form.name.trim().length < 2) missing.push("name");
    if (!/^(\+?65)?[3689]\d{7}$/.test(form.phone.replace(/[\s-]/g, ""))) missing.push("phone");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) missing.push("email");
    if (!agree) missing.push("agree");
    if (missing.length) return setError({ message: missing.length === 1 && missing[0] === "agree" ? "Please accept the privacy policy to continue." : "Please fill in the highlighted fields.", fields: missing });
    setBusy(true);
    setError(null);
    try {
      const result = await apiPost("/enquiries", {
        occasion: form.occasion,
        eventDate: form.eventDate,
        startTime: form.startTime,
        guests,
        wholeVenue,
        ...(form.budget.trim() ? { budget: form.budget.trim() } : {}),
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        ...(form.message.trim() ? { message: form.message.trim() } : {}),
        agree: true,
      });
      setSent(result.code);
      document.getElementById("enquire")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (failure) {
      setError({
        message: failure.status ? failure.details?.guests?.[0] ?? failure.message : "We couldn’t reach the server. Check your connection and try again.",
        fields: failure.details?.code === "TOO_SOON" ? ["eventDate"] : failure.details && !failure.details.code ? Object.keys(failure.details) : [],
      });
    }
    setBusy(false);
  };

  return (
    <div className="events-page">
      <PageHero eyebrow="Events & parties" title="Make it a" accent="night." script="the whole crew’s invited" image={place("long-table")}>
        <p className="lead">Birthdays, office parties, farewells and watch parties. Long tables, sharing platters, Brewerkz on tap and a team that loves a celebration.</p>
        <div className="phero__ctas">
          <Button variant="primary" icon={<Arrow />} onClick={() => document.getElementById("enquire")?.scrollIntoView({ behavior: "smooth" })}>Plan my event</Button>
          <Button to="/reserve" variant="ghost">Just a table? Book here</Button>
        </div>
      </PageHero>

      <div ref={root}>
      <section className="section">
        <div className="container">
          <SectionHead eyebrow="What we host" title="Pick your party" script={`groups of ${rules?.guests?.min ?? 8} to ${rules?.guests?.max ?? 150}`} />
          <div className="occ">
            {OCCASIONS.map((o, i) => (
              <article key={o.name} className="occ__card" data-reveal={i * 0.08}>
                <div className="occ__media"><Food image={o.image} alt={o.name} sizes="(max-width: 760px) 100vw, 25vw" /></div>
                <Sticker tone={i % 2 ? "lime" : "cream"} rotate={i % 2 ? 6 : -6} className="occ__sticker">{o.sticker}</Sticker>
                <div className="occ__body">
                  <h3 className="display occ__title">{o.name}</h3>
                  <p>{o.line}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section steps3">
        <div className="container">
          <SectionHead eyebrow="How it works" title="Three steps to a big night" align="center" />
          <ol className="steps3__list">
            {STEPS.map((s, i) => (
              <li key={s.n} className="steps3__item" data-reveal={i * 0.1}>
                <span className="steps3__n">{s.n}</span>
                <h3 className="display">{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
          <p className="steps3__note">Feeding the crew? Our <MoCoLink to="/menu#platters">sharing platters</MoCoLink> serve 3–4 each.</p>
        </div>
      </section>

      <section className="section" id="enquire">
        <div className="container">
          {sent ? (
            <div className="cbox evsent">
              <Flame className="ph__flame" />
              <span className="eyebrow">Enquiry {sent}</span>
              <h2 className="display evsent__title">We’re on it!</h2>
              <p className="lead">Thanks, {form.name.split(" ")[0]}. Our events team will get back to you within one working day with ideas and prices. We’ve emailed you a copy.</p>
              <div className="track__actions">
                <Button to="/menu" variant="ghost">Browse the menu</Button>
                <Button to={site.whatsappHref} variant="ghost">WhatsApp us</Button>
              </div>
            </div>
          ) : (
            <form className="evform" onSubmit={submit} noValidate>
              <div className="evform__intro">
                <SectionHead eyebrow="Enquire" title="Let’s plan it" script="no payment needed">
                  <p className="lead">Tell us what you have in mind. We need at least {rules?.leadHours ?? 24} hours’ notice; for tonight, call <a href={site.phoneHref}>{site.phone}</a>.</p>
                </SectionHead>
              </div>
              <div className="cbox evform__box">
                <div className="book__label">Occasion</div>
                <div className="chips">
                  {occasions.map((o) => (
                    <button key={o} type="button" className={`chip ${form.occasion === o ? "is-on" : ""}`} onClick={() => setForm((f) => ({ ...f, occasion: o }))}>{o}</button>
                  ))}
                </div>
                <div className="cbox__fields">
                  <label className={`field ${err("eventDate") ? "field--err" : ""}`}><span>Date</span><input type="date" min={minDate} value={form.eventDate} onChange={set("eventDate")} /></label>
                  <label className="field"><span>Start time</span>
                    <select value={form.startTime} onChange={set("startTime")}>{TIMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
                  </label>
                  <div className="field">
                    <span>Guests</span>
                    <QtyStepper value={guests} min={rules?.guests?.min ?? 8} max={rules?.guests?.max ?? 150} onChange={(n) => setGuests(n)} label="Number of guests" />
                  </div>
                  <label className="field"><span>Budget (optional)</span><input value={form.budget} onChange={set("budget")} placeholder="e.g. S$50 per person" maxLength={60} /></label>
                </div>
                <label className="csum__agree cbox__opt">
                  <input type="checkbox" checked={wholeVenue} onChange={(e) => setWholeVenue(e.target.checked)} />
                  <span>We’d like the whole place to ourselves (private hire)</span>
                </label>
                <div className="cbox__fields">
                  <label className={`field ${err("name") ? "field--err" : ""}`}><span>Name</span><input value={form.name} onChange={set("name")} autoComplete="name" maxLength={80} /></label>
                  <label className={`field ${err("phone") ? "field--err" : ""}`}><span>Mobile (Singapore)</span><input value={form.phone} onChange={set("phone")} autoComplete="tel" inputMode="tel" placeholder="9123 4567" maxLength={20} /></label>
                  <label className={`field field--wide ${err("email") ? "field--err" : ""}`}><span>Email</span><input type="email" value={form.email} onChange={set("email")} autoComplete="email" maxLength={120} /></label>
                  <label className="field field--wide"><span>Tell us more (optional)</span><textarea rows="3" maxLength={1000} value={form.message} onChange={set("message")} placeholder="Surprise party? Dietary needs? Big screen for the match?" /></label>
                </div>
                <label className={`csum__agree ${err("agree") ? "field--err" : ""}`}>
                  <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setError(null); }} />
                  <span>I agree to the <MoCoLink to="/privacy">privacy policy</MoCoLink>. Nothing is booked or charged until we confirm with you.</span>
                </label>
                {error && <p className="csum__error" role="alert">{error.message}</p>}
                <Button variant="primary" size="lg" type="submit" disabled={busy} className="csum__pay" icon={<Arrow />}>{busy ? "Sending…" : "Send my enquiry"}</Button>
              </div>
            </form>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}
