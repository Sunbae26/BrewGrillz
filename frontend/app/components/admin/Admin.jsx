import { useEffect, useState } from "react";

/* Small building blocks shared by the dashboard pages. */

// Button that needs a second tap to confirm (no browser pop-ups).
export function TwoTap({ label, confirmLabel = "Tap again to confirm", onConfirm, tone = "ghost", disabled }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <button
      type="button"
      disabled={disabled}
      className={`abtn abtn--${armed ? "danger" : tone}`}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}

export const ABtn = ({ tone = "ghost", className = "", ...props }) => <button type="button" className={`abtn abtn--${tone} ${className}`} {...props} />;

export function Empty({ children }) {
  return <p className="adm__empty">{children}</p>;
}

export function Loading() {
  return <p className="adm__empty">Loading…</p>;
}

export function ErrorNote({ error }) {
  if (!error) return null;
  return <p className="falert falert--error" role="alert">{error.message || "Something went wrong."}</p>;
}

export const Pill = ({ status, children }) => <span className={`olist__status olist__status--${String(status).toLowerCase()}`}>{children}</span>;

export const sgTime = (iso, opts = { hour: "numeric", minute: "2-digit" }) => new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", ...opts }).format(new Date(iso));
export const sgDay = (iso) => sgTime(iso, { weekday: "short", day: "numeric", month: "short" });
export const todaySG = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date());

export function PageHead({ title, children }) {
  return (
    <div className="adm__head">
      <h2 className="display adm__title">{title}</h2>
      {children && <div className="adm__tools">{children}</div>}
    </div>
  );
}
