import { useRef } from "react";
import { useReveals } from "../motion/effects";
import { useAuth } from "../lib/auth.jsx";
import PageHero from "../components/ui/PageHero";
import { Button, Arrow, SectionHead, Flame } from "../components/ui/ui";
import MoCoLink from "../motion/MoCoLink";

/* REWARDS CLUB — how points work, with a join / sign-in call to action. */

export const meta = () => [
  { title: "Rewards Club | BrewGrillz Singapore — Earn Points on Every Bill" },
  { name: "description", content: "Join the BrewGrillz Rewards Club free: 1 point for every S$1 on pickup orders and dine-in bills, 100 points = S$5 off." },
];

const STEPS = [
  { n: "01", title: "Join free", text: "Create an account in under a minute. Just your name, email and a password." },
  { n: "02", title: "Earn on every S$1", text: "Points land automatically on pickup orders. Eating in? Give us your email or mobile when you pay." },
  { n: "03", title: "Spend at checkout", text: "Every 100 points takes S$5 off a pickup order. Use as many blocks as you like." },
];

export default function Rewards() {
  const root = useRef(null);
  useReveals(root);
  const { user } = useAuth();

  return (
    <div className="rewards-page">
      <PageHero eyebrow="Rewards Club" title="Eat. Drink." accent="Earn." tone="lime" script="every dollar counts">
        <p className="lead">1 point for every S$1 on pickup orders and dine-in bills. 100 points = <b>S$5 off</b>. Free to join, no cards to carry.</p>
        <div className="phero__ctas">
          {user ? (
            <Button to="/account" variant="primary" icon={<Arrow />}>See my points</Button>
          ) : (
            <>
              <Button to="/register?next=/rewards" variant="primary" icon={<Arrow />}>Join free</Button>
              <Button to="/login?next=/rewards" variant="ghost">I’m a member</Button>
            </>
          )}
        </div>
      </PageHero>

      <div ref={root}>
        <section className="section">
          <div className="container">
            <SectionHead eyebrow="How it works" title="Three steps to free food" align="center" />
            <ol className="steps3__list">
              {STEPS.map((s, i) => (
                <li key={s.n} className="steps3__item" data-reveal={i * 0.1}>
                  <span className="steps3__n">{s.n}</span>
                  <h3 className="display">{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section rmath">
          <div className="container rmath__inner" data-reveal>
            <div className="rcard rcard--big">
              <div className="rcard__top">
                <span className="rcard__brand">BREW<b>GRILLZ</b></span>
                <Flame className="rcard__flame" />
              </div>
              <span className="rcard__label">Example</span>
              <b className="rcard__points">S$100 <small>spent</small></b>
              <span className="rcard__deal">= 100 points = S$5 off next time</span>
              <div className="rcard__stripe" />
            </div>
            <div className="rmath__copy">
              <h2 className="display rmath__title">The maths is <span className="neon neon--lime">simple</span></h2>
              <ul className="legal__section rmath__list">
                <li>Points are added when your pickup order is paid, or when our team adds your dine-in bill.</li>
                <li>Spend them in blocks of 100 at checkout (signed in). At least S$0.50 is always paid online.</li>
                <li>Cancelled orders take back their points, and give back any you spent.</li>
                <li>Alcohol can’t be ordered online, but dine-in bills with drinks still earn points.</li>
              </ul>
              {!user && <Button to="/register?next=/rewards" variant="primary" icon={<Arrow />}>Join the club</Button>}
              <p className="rmath__small">By joining you agree to our <MoCoLink to="/terms">terms</MoCoLink> and <MoCoLink to="/privacy">privacy policy</MoCoLink>.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
