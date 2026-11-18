// Orders placed from this browser, so guests can find them again at /track (newest first, last 20).
const KEY = "bgz-orders-v2";

export function getLocalOrders() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list.filter((o) => o?.code && o?.token) : [];
  } catch {
    return [];
  }
}

export function saveLocalOrder({ code, token, at = new Date().toISOString() }) {
  try {
    const rest = getLocalOrders().filter((o) => o.code !== code);
    localStorage.setItem(KEY, JSON.stringify([{ code, token, at }, ...rest].slice(0, 20)));
  } catch {
    /* private mode */
  }
}
