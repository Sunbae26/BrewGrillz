const sg = (options) => new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", ...options });

export const money = (dollars) => `$${Number(dollars).toFixed(2)}`;
export const cents = (value) => `$${(value / 100).toFixed(2)}`;
export const time = (iso) => sg({ hour: "numeric", minute: "2-digit" }).format(new Date(iso));
export const formatPickup = (iso) =>
  sg({ weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
