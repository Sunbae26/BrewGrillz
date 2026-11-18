import * as Sentry from "@sentry/node";
import { env } from "../config/env.js";

export const monitoringEnabled = Boolean(env.SENTRY_DSN);

if (monitoringEnabled) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    defaultIntegrations: false,
    integrations: [
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.contextLinesIntegration(),
    ],
  });
}

export function reportError(error, req) {
  if (!monitoringEnabled) return;
  Sentry.withScope((scope) => {
    if (req) {
      scope.setTag("request_id", req.id);
      scope.setContext("request", {
        method: req.method,
        path: req.originalUrl?.split("?")[0],
      });
    }
    Sentry.captureException(error);
  });
}

export function reportMessage(message, { level = "error", extra } = {}) {
  if (!monitoringEnabled) return;
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    if (extra) scope.setContext("details", extra);
    Sentry.captureMessage(message);
  });
}

export const flushMonitoring = () =>
  monitoringEnabled ? Sentry.flush(2000) : Promise.resolve(true);
