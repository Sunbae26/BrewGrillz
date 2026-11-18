import { env } from "../config/env.js";
import { reportError } from "../lib/monitoring.js";

export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Route not found" });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.status ?? error.statusCode ?? 500;
  if (status >= 500) {
    console.error(
      `[${req.id ?? "-"}] ${req.method} ${req.originalUrl?.split("?")[0]} failed:`,
      error,
    );
    reportError(error, req);
  }
  if (status === 401 && error.code)
    res.set("WWW-Authenticate", `Bearer error="invalid_token"`);
  res.status(status).json({
    error:
      status >= 500 && env.isProduction
        ? "Something went wrong. Please try again."
        : error.message,
    ...(error.code ? { code: error.code } : {}),
    ...(error.details ? { details: error.details } : {}),
    ...(status >= 500 && req.id ? { requestId: req.id } : {}),
  });
}
