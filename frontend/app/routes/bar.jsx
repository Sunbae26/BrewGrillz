import { useRef, useLayoutEffect } from "react";
import { useMenu, loadOrNull } from "../lib/queries.js";
import { useReveals } from "../motion/effects";
import { gsap, prefersReducedMotion } from "../motion/gsap";
import PageHero from "../components/ui/PageHero";
import { Pint } from "../components/home/BarTeaser";
import Marquee from "../components/layout/Marquee";
import { Button, Arrow, SectionHead } from "../components/ui/ui";
import { taps, cocktails } from "../config/home";
import MoCoLink from "../motion/MoCoLink";
import { seo } from "../lib/seo.js";

/* THE BAR — house taps, then every drink from the menu (from the API), all dine-in. */

export async function loader() {
  return { menu: await loadOrNull("/menu") };
}

export const meta = () =>
  seo({
    title: "The Bar | BrewGrillz Singapore — Brewerkz Craft Beer, Cocktails & Wine in Bugis",
    description: "Three house beers brewed by Brewerkz for BrewGrillz, buckets of five, cocktails, wines and spirits at 163 Rochor Road, Bugis.",
    path: "/bar",
  });

const price = (n) => (n == null ? "—" : `$${Number.isInteger(n) ? n : n.toFixed(1)}`);

export default function Bar({ loaderData }) {
  const root = useRef(null);
  useReveals(root);
  const { data: menu } = useMenu(loaderData?.menu ?? undefined);
  const drinks = (menu?.categories ?? []).filter((c) => c.group === "drinks" && !c.orderable);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray(".pint__liquid").forEach((el, i) => {
        const fill = parseFloat(el.dataset.fill);
        gsap.fromTo(el, { y: 200 }, { y: 200 - 200 * fill, duration: 2.2, ease: "power2.out", delay: i * 0.18, scrollTrigger: { trigger: el.closest(".taps"), start: "top 80%" } });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div className="bar-page">
      <PageHero eyebrow="After dark at BrewGrillz" title="The" accent="Bar" tone="lime" script="cold pints, warm nights">
        <p className="lead">Three house beers brewed by <b>Brewerkz</b> just for us, buckets of five, proper cocktails and a wine list worth sitting down for.</p>
        <div className="phero__ctas">
          <Button to="/reserve" variant="primary" icon={<Arrow />}>Book a table</Button>
          <Button variant="ghost" onClick={() => document.getElementById("drinks")?.scrollIntoView({ behavior: "smooth" })}>See every drink</Button>
        </div>
      </PageHero>

      <div ref={root}>
      <section className="section bar bar--page">
        <div className="bar__glow" aria-hidden="true" />
        <div className="container">
          <SectionHead eyebrow="On tap" title="Brewed for us, poured by the pint" script="480ml of happy" />
          <div className="taps">
            {taps.map((t, i) => (
              <article key={t.name} className="tap" data-reveal={i * 0.1}>
                <Pint color={t.color} fill={t.fill} />
                <div className="tap__info">
                  <span className="tap__abv">{t.abv}% ABV</span>
                  <h3 className="display tap__name">{t.name}</h3>
                  <span className="tap__style">{t.style}</span>
                  <p className="tap__notes">{t.notes}</p>
                  <span className="tap__price"><small>$</small>13.5 <em>/ pint</em></span>
                </div>
              </article>
            ))}
          </div>
        </div>
        <Marquee className="marquee--neon" items={cocktails.map((c) => `${c.name} $${c.price}`)} speed={55} separator="●" />
      </section>

      <section className="section" id="drinks">
        <div className="container">
          <SectionHead eyebrow="The full list" title="Every drink we pour" script="dine-in only">
            <p className="lead">Alcohol is served at the restaurant only, not for online orders. Soft drinks, mocktails and coffee can be added to your <MoCoLink to="/menu#softdrinks">pickup order</MoCoLink>.</p>
          </SectionHead>
          {drinks.length === 0 ? (
            <p className="lead">Loading the drinks list…</p>
          ) : (
            <div className="barlist">
              {drinks.map((c) => (
                <section key={c.id} className="barlist__cat" data-reveal>
                  <h3 className="display barlist__title">{c.name}</h3>
                  <div className="board">
                    {c.sections.map((s) => (
                      <div key={s.title} className="board__block">
                        <div className="board__head">
                          <div>
                            <h4 className="board__title">{s.title}</h4>
                            {s.sub && <p className="board__sub">{s.sub}</p>}
                          </div>
                          {s.cols.some(Boolean) && <div className="board__cols" aria-hidden="true">{s.cols.map((col) => <span key={col}>{col}</span>)}</div>}
                        </div>
                        <ul className="board__rows">
                          {s.rows.map((r) => (
                            <li key={r.id} className={`board__row ${r.available === false ? "is-sold" : ""}`}>
                              <div className="board__name"><b>{r.name}</b>{r.info && <span>{r.info}</span>}</div>
                              <span className="board__dots" aria-hidden="true" />
                              <div className="board__prices">{r.prices.map((p, i) => <span key={i}>{price(p)}</span>)}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          <p className="barlist__note">{menu?.notes?.prices} Please drink responsibly. We don’t serve alcohol to anyone under 18.</p>
        </div>
      </section>
      </div>
    </div>
  );
}
