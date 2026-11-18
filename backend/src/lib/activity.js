const QUIET_AFTER_MS = 15 * 60_000;
const QUIET_PATHS = new Set(["/api/ping", "/api/health"]);

let lastSeen = Date.now();
const wakeHandlers = new Set();

export const isQuiet = (now = Date.now()) => now - lastSeen > QUIET_AFTER_MS;

export function onWake(handler) {
  wakeHandlers.add(handler);
  return () => wakeHandlers.delete(handler);
}

export function markActive(now = Date.now()) {
  const wasQuiet = isQuiet(now);
  lastSeen = now;
  if (wasQuiet) wakeHandlers.forEach((handler) => setImmediate(handler));
}

export function trackActivity(req, res, next) {
  if (!QUIET_PATHS.has(req.path)) markActive();
  next();
}
