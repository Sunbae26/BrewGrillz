import { flushMonitoring, reportError } from "./lib/monitoring.js";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { isQuiet, onWake } from "./lib/activity.js";
import { expireStaleOrders } from "./modules/orders/orders.service.js";
import { expireStaleRequests } from "./modules/reservations/reservations.service.js";
import { pruneRefreshTokens } from "./modules/auth/tokens.service.js";
import { processEmailOutbox } from "./modules/email/email.service.js";

const server = createApp().listen(env.PORT, () => {
  console.log(`BrewGrillz API running on http://localhost:${env.PORT}`);
});

const backgroundFailure = (label) => (error) => {
  console.error(`${label}:`, error);
  reportError(error);
};

// Background jobs pause when nobody has visited for 15 minutes (so Neon can sleep) and catch up on the next visit.
function every(ms, job, { runNow = false, whenQuiet = false } = {}) {
  let running = false;
  const run = () => {
    if (running) return;
    running = true;
    job().finally(() => {
      running = false;
    });
  };
  const tick = () => {
    if (whenQuiet || !isQuiet()) run();
  };
  if (runNow) run();
  setInterval(tick, ms).unref();
  if (!whenQuiet) onWake(run);
}

every(
  5 * 60_000,
  () =>
    expireStaleOrders()
      .then((count) => count && console.log(`Released ${count} unpaid order(s) past their payment deadline.`))
      .catch(backgroundFailure("Expiring unpaid orders failed")),
  { runNow: true },
);

every(15 * 60_000, () =>
  expireStaleRequests()
    .then((count) => count && console.log(`Closed ${count} table request(s) that were never answered.`))
    .catch(backgroundFailure("Closing stale table requests failed")),
);

every(
  60_000,
  () =>
    processEmailOutbox()
      .then((count) => count && console.log(`Delivered ${count} queued email(s).`))
      .catch(backgroundFailure("Sending queued emails failed")),
  { whenQuiet: true },
);

every(24 * 60 * 60_000, () => pruneRefreshTokens().catch(backgroundFailure("Removing old app sign-ins failed")), { whenQuiet: true });

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    await flushMonitoring();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
