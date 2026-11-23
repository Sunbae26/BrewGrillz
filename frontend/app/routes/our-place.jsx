import { useRef, useState } from "react";
import { useReveals } from "../motion/effects";
import PageHero from "../components/ui/PageHero";
import { Button, Arrow, Food, Sticker, SectionHead } from "../components/ui/ui";
import { Visit } from "../components/home/Extras";
import MoCoLink from "../motion/MoCoLink";
import { img, place } from "../config/home";
import { site } from "../config/site";
import { seo } from "../lib/seo.js";

/* OUR PLACE — the story, the room, the vibe, and the practical bits (FAQ + map). */

export const meta = () =>
  seo({
    title: "Our Place | BrewGrillz Singapore — Grill & Craft Bar on Rochor Road, Bugis",
    description: "BrewGrillz is a grill and craft bar at 163 Rochor Road, Bugis: flame-grilled steaks, sharing platters, Italian pizza and Brewerkz beer in a stylish, cosy, slightly rustic room.",
    path: "/our-place",
  });

const PILLARS = [
  { k: "01", title: "The fire", text: "Steaks, ribs, skewers and platters cooked to order over a hot grill. Simple food, done properly.", image: img("sirloin"), sticker: "Flame-grilled" },
  { k: "02", title: "The pour", text: "Three house beers brewed by Brewerkz for BrewGrillz, plus cocktails, wine and spirits.", image: place("taps"), sticker: "On tap" },
  { k: "03", title: "The crew", text: "Locals after work, friends from out of town, birthdays at the long table. Everyone’s welcome.", image: place("booth"), sticker: "Luv it" },
];

const GALLERY = [
  { image: img("mixed-grill-platter"), caption: "Mixed grill platter" },
  { image: img("honey-garlic-pizza"), caption: "Honey garlic chicken pizza" },
  { image: img("carbonara"), caption: "Classic carbonara" },
  { image: img("beef-burger"), caption: "Raclette beef burger" },
  { image: img("tenderloin"), caption: "Grass-fed tenderloin" },
];

const FAQ = [
  { q: "Do I need to book?", a: <>Walk-ins are welcome, but evenings and weekends get busy. <MoCoLink to="/reserve">Book a table</MoCoLink> online for up to 45 guests; we hold it for 15 minutes after your booking time.</> },
  { q: "Can I order food to take away?", a: <>Yes. <MoCoLink to="/menu">Order online</MoCoLink>, pay, and pick it up at 163 Rochor Road. For delivery, find us on GrabFood and foodpanda.</> },
  { q: "Can I order drinks online?", a: "Soft drinks, mocktails and coffee, yes. Beer, wine, cocktails and spirits are served at the restaurant only." },
  { q: "Are prices inclusive of GST?", a: "Yes, menu prices include GST. A 10% service charge applies to dine-in only, not to pickup orders." },
  { q: "Can you host a big group or a private party?", a: <>Definitely. For groups over 10, birthdays, office parties or private hire, <MoCoLink to="/events">send us an event enquiry</MoCoLink> and we’ll plan it with you.</> },
  { q: "Any allergies or dietary needs?", a: "Tell our team before ordering. Dietary tags on the menu are a guide only." },
];

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="faq">
      {FAQ.map((f, i) => (
        <div key={f.q} className={`faq__item ${open === i ? "is-open" : ""}`} data-reveal={i * 0.04}>
          <button type="button" className="faq__q" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
            <span>{f.q}</span>
            <span className="faq__sign" aria-hidden="true">{open === i ? "–" : "+"}</span>
          </button>
          {open === i && <div className="faq__a">{f.a}</div>}
        </div>
      ))}
    </div>
  );
}

export default function OurPlace() {
  const root = useRef(null);
  useReveals(root);
  return (
    <div className="place-page">
      <PageHero eyebrow="Our place" title="Chill it. Grill it." accent="Luv it." script="163 Rochor Road, Bugis" image={place("dining")}>
        <p className="lead">A grill and craft bar in the middle of Bugis. Stylish, cosy and a little bit rustic, with a grill that’s always fired up and a bar that’s always pouring.</p>
        <div className="phero__ctas">
          <Button to="/reserve" variant="primary" icon={<Arrow />}>Book a table</Button>
          <Button to="/menu" variant="ghost">See the menu</Button>
        </div>
      </PageHero>

      <div ref={root}>
      <section className="section">
        <div className="container">
          <SectionHead eyebrow="What we’re about" title="Three things we take seriously" />
          <div className="pillars">
            {PILLARS.map((p, i) => (
              <article key={p.k} className="pillar" data-reveal={i * 0.1}>
                <div className="pillar__media"><Food image={p.image} alt={p.title} sizes="(max-width: 760px) 100vw, 33vw" /></div>
                <Sticker tone={i === 1 ? "lime" : "cream"} rotate={i % 2 ? 6 : -6} className="pillar__sticker">{p.sticker}</Sticker>
                <span className="pillar__k">{p.k}</span>
                <h3 className="display pillar__title">{p.title}</h3>
                <p>{p.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section place-quote">
        <div className="container">
          <p className="display place-quote__text" data-reveal>
            Good food. <span className="neon neon--red">Cold beer.</span> Better company.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Fresh off the grill" title="A taste of the table" script="made here, every night" />
          <div className="pgal">
            {GALLERY.map((g, i) => (
              <figure key={g.caption} className={`pgal__tile pgal__tile--${i}`} data-reveal={i * 0.05}>
                <Food image={g.image} alt={g.caption} sizes="(max-width: 760px) 50vw, 25vw" />
                <figcaption>{g.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container faq__wrap">
          <SectionHead eyebrow="Good to know" title="Questions, answered">
            <p className="lead">Anything else? Call <a href={site.phoneHref}>{site.phone}</a> or WhatsApp <a href={site.whatsappHref} target="_blank" rel="noreferrer">{site.whatsapp}</a>.</p>
          </SectionHead>
          <Faq />
        </div>
      </section>
      </div>

      <Visit />
    </div>
  );
}
