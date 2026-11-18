import MoCoLink from "../../motion/MoCoLink";
import { Flame } from "../ui/ui";

// Shared frame for sign in, sign up, password and staff login pages.
export function AuthShell({ eyebrow = "Rewards Club", title, accent, intro, children, footer, aside }) {
  return (
    <section className="auth">
      <div className="auth__glow" aria-hidden="true" />
      <div className="container auth__grid">
        <div className="auth__card">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="display auth__title">
            {title} {accent && <span className="text-red">{accent}</span>}
          </h1>
          {intro && <p className="auth__intro">{intro}</p>}
          {children}
          {footer && <div className="auth__footer">{footer}</div>}
        </div>
        {aside !== false && (aside ?? <RewardsAside />)}
      </div>
    </section>
  );
}

function RewardsAside() {
  return (
    <aside className="auth__aside" aria-hidden="true">
      <div className="rcard">
        <div className="rcard__top">
          <span className="rcard__brand">BREW<b>GRILLZ</b></span>
          <Flame className="rcard__flame" />
        </div>
        <span className="rcard__label">Rewards Club</span>
        <b className="rcard__points">1 pt <small>per S$1</small></b>
        <span className="rcard__deal">100 pts = S$5 off</span>
        <div className="rcard__stripe" />
      </div>
      <ul className="auth__perks">
        <li>Points on pickup orders and dine-in bills</li>
        <li>Spend them at checkout, 100 at a time</li>
        <li>Your orders and table bookings in one place</li>
      </ul>
    </aside>
  );
}

export function TextField({ id, label, hint, error, ...props }) {
  return (
    <label className={`field ${error ? "field--err" : ""}`} htmlFor={id}>
      <span>{label}</span>
      <input id={id} name={id} {...props} aria-invalid={Boolean(error)} aria-describedby={hint || error ? `${id}-hint` : undefined} />
      {(error || hint) && <small id={`${id}-hint`} className={error ? "field__error" : "field__hint"}>{error || hint}</small>}
    </label>
  );
}

export function FormAlert({ tone = "error", children }) {
  return (
    <p className={`falert falert--${tone}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}

export const AuthLink = ({ to, children }) => (
  <MoCoLink to={to} className="auth__link">
    {children}
  </MoCoLink>
);
