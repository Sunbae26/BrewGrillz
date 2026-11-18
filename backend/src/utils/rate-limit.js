import { isIP } from "node:net";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../config/env.js";

export function clientIp(req) {
  if (env.CLIENT_IP_HEADER) {
    const value = String(req.get(env.CLIENT_IP_HEADER) ?? "")
      .split(",")[0]
      .trim();
    if (isIP(value)) return value;
  }
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

export const clientKey = (req) => ipKeyGenerator(clientIp(req));

export function limiter({ windowMs, limit, message, skipFailedRequests, key }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipFailedRequests: Boolean(skipFailedRequests),
    keyGenerator: key
      ? (req) => `${clientKey(req)}|${key(req)}`
      : (req) => clientKey(req),
    ...(message ? { message: { error: message } } : {}),
  });
}
