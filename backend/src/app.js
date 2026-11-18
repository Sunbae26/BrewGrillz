import express from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import { env } from "./config/env.js";
import { limiter } from "./utils/rate-limit.js";
import { prisma } from "./lib/prisma.js";
import { trackActivity } from "./lib/activity.js";
import { menuRouter } from "./modules/menu/menu.routes.js";
import { infoRouter } from "./modules/info/info.routes.js";
import { ordersRouter } from "./modules/orders/orders.routes.js";
import { webhooksRouter } from "./modules/payments/webhooks.routes.js";
import { authRouter, tokenRouter } from "./modules/auth/auth.routes.js";
import { accountRouter } from "./modules/account/account.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { loadUser } from "./middleware/auth.js";
import { reservationsRouter } from "./modules/reservations/reservations.routes.js";
import { enquiriesRouter } from "./modules/enquiries/enquiries.routes.js";
import { newsletterRouter } from "./modules/newsletter/newsletter.routes.js";
import { notFoundHandler, errorHandler } from "./middleware/error-handler.js";
import { requestId } from "./middleware/request-id.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", env.TRUST_PROXY);
  app.disable("x-powered-by");
  app.use(requestId);
  app.use(trackActivity);
  app.use(helmet());
  app.use(compression());
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  // Webhooks read the raw body to check signatures, so they go before express.json().
  app.use("/api/webhooks", webhooksRouter);
  app.use(express.json({ limit: "100kb" }));

  // For Render's health check and uptime monitors: no database query, so Neon can sleep.
  app.get("/api/ping", (req, res) => {
    res.set("Cache-Control", "no-store").json({ status: "ok", time: new Date().toISOString() });
  });

  // Manual checks only (it wakes the database).
  app.get("/api/health", async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.set("Cache-Control", "no-store").json({ status: "ok", time: new Date().toISOString() });
  });

  app.use("/api", limiter({ windowMs: 60_000, limit: 1200 }));
  app.use("/api/info", infoRouter);
  app.use("/api/menu", menuRouter);
  app.use("/api/auth/token", tokenRouter);
  app.use("/api/auth", loadUser, authRouter);
  app.use("/api/account", loadUser, accountRouter);
  app.use("/api/admin", loadUser, adminRouter);
  app.use("/api/orders", loadUser, ordersRouter);
  app.use("/api/reservations", loadUser, reservationsRouter);
  app.use("/api/enquiries", enquiriesRouter);
  app.use("/api/newsletter", newsletterRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
