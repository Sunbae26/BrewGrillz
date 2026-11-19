import { useEffect, useState } from "react";
import { dayParts } from "../../lib/booking.js";

/* Day ribbon, time grid and their loading shimmer, shared by checkout (pickup) and the booking page.
   Our own design instead of the phone's built-in dropdown list. */

// true once something has been loading for longer than `ms` (to explain a slow first load)
export function useSlow(loading, ms = 4000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading) return setSlow(false);
    const timer = setTimeout(() => setSlow(true), ms);
    return () => clearTimeout(timer);
  }, [loading, ms]);
  return slow;
}

export function LoadingNote({ loading, label = "Getting the latest times…" }) {
  const slow = useSlow(loading);
  if (!loading) return null;
  return (
    <p className="pick__loading" role="status">
      <span className="pick__spinner" aria-hidden="true" />
      {slow ? "Still loading. The first visit can take up to a minute, thanks for waiting." : label}
    </p>
  );
}

export function DayRibbon({ days, value, onChange, loading, label = "Choose a day" }) {
  if (loading || !days.length)
    return (
      <div className="ribbon" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => <span key={i} className="ribbon__day ribbon__day--ghost shimmer" />)}
      </div>
    );
  return (
    <div className="ribbon" role="listbox" aria-label={label}>
      {days.map((d) => {
        const p = dayParts(d.date);
        const top = /^(Today|Tomorrow)/.test(d.label ?? "") ? d.label.split(",")[0] : p.weekday;
        return (
          <button
            key={d.date}
            type="button"
            role="option"
            aria-selected={value === d.date}
            disabled={d.closed}
            className={`ribbon__day ${value === d.date ? "is-on" : ""}`}
            onClick={() => onChange(d.date)}
          >
            <span>{top}</span>
            <b>{p.day}</b>
            <span>{d.closed ? "Closed" : p.month}</span>
          </button>
        );
      })}
    </div>
  );
}

const sgHour = (iso) => Number(new Intl.DateTimeFormat("en-SG", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Singapore" }).format(new Date(iso)));
const PERIODS = [
  ["Lunch", (h) => h < 15],
  ["Afternoon", (h) => h >= 15 && h < 18],
  ["Evening", (h) => h >= 18],
];

// Time buttons; long lists (pickup every 15 min) are split into Lunch / Afternoon / Evening
export function TimeGrid({ times, value, onChange, loading, grouped = false, label = "Choose a time" }) {
  if (loading)
    return (
      <div className="slots" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => <span key={i} className="slot slot--ghost shimmer" />)}
      </div>
    );
  const button = (t) => (
    <button
      key={t.iso}
      type="button"
      role="option"
      aria-selected={value === t.iso}
      disabled={t.available === false}
      className={`slot ${value === t.iso ? "is-on" : ""}`}
      onClick={() => onChange(t.iso)}
    >
      {t.label}
      {t.available === false && <small>Full</small>}
    </button>
  );
  if (!grouped)
    return (
      <div className="slots" role="listbox" aria-label={label}>
        {times.map(button)}
      </div>
    );
  return (
    <div className="pick__groups">
      {PERIODS.map(([name, test]) => {
        const list = times.filter((t) => test(sgHour(t.iso)));
        if (!list.length) return null;
        return (
          <div key={name} className="pick__group">
            <div className="pick__period">{name}</div>
            <div className="slots" role="listbox" aria-label={`${label}: ${name}`}>
              {list.map(button)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
