import { apiGet } from "./api.js";

export const bookingPath = (code, token) => `/reservations/${encodeURIComponent(code)}?t=${encodeURIComponent(token)}`;
export const fetchBooking = (code, token, signal) => apiGet(bookingPath(code, token), { signal });

const sg = (options) => new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", ...options });
export const bookingDay = (iso) => sg({ weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
export const bookingTime = (iso) => sg({ hour: "numeric", minute: "2-digit" }).format(new Date(iso));

// Day chips for the date ribbon (from "YYYY-MM-DD" in Singapore time)
export function dayParts(date) {
  const d = new Date(`${date}T12:00:00+08:00`);
  return {
    weekday: sg({ weekday: "short" }).format(d),
    day: sg({ day: "numeric" }).format(d),
    month: sg({ month: "short" }).format(d),
  };
}

// "Add to calendar": a small .ics file made in the browser
export function calendarFile({ code, startsAt, partySize, minutes = 120 }) {
  const stamp = (d) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(new Date(startsAt).getTime() + minutes * 60_000);
  const body = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BrewGrillz//Booking//EN", "BEGIN:VEVENT",
    `UID:${code}@brewgrillz.sg`, `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(startsAt)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:Table at BrewGrillz (${partySize} guests)`,
    "LOCATION:BrewGrillz\\, 163 Rochor Road\\, Bugis Street\\, Singapore 188438",
    `DESCRIPTION:Booking ${code}. Call +65 6312 2847 if you're running late.`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
}

// Bookings made on this device (like orders), so guests can get back to them
const KEY = "bgz-bookings-v1";
export function getLocalBookings() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list.filter((b) => b?.code && b?.token) : [];
  } catch {
    return [];
  }
}
export function saveLocalBooking({ code, token }) {
  try {
    const rest = getLocalBookings().filter((b) => b.code !== code);
    localStorage.setItem(KEY, JSON.stringify([{ code, token }, ...rest].slice(0, 10)));
  } catch {
    /* private mode */
  }
}
