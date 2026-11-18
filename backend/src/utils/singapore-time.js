const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Singapore",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function singaporeParts(date = new Date()) {
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function addDays(isoDate, days) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export function isoWeekday(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7;
}

export const toMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const singaporeInstant = (isoDate, minutes) =>
  new Date(
    `${isoDate}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00+08:00`,
  );

// Making an Intl.DateTimeFormat is slow (the pickup-time list formats hundreds of times per request),
// so each set of options gets one formatter that's reused.
const formatters = new Map();
export function formatSingapore(date, options) {
  const key = JSON.stringify(options);
  let format = formatters.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", ...options });
    formatters.set(key, format);
  }
  return format.format(date);
}

export const formatPickup = (date) =>
  formatSingapore(date, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

export const time12 = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
};
