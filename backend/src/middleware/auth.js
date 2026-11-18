import { prisma } from "../lib/prisma.js";
import { HttpError, unauthorized } from "../utils/http-error.js";
import { readBearerToken, verifyAccessToken } from "../utils/jwt.js";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  isValidSignature,
  readCookie,
  readSessionValue,
} from "../utils/session.js";

async function loadTokenUser(req, token) {
  const claims = await verifyAccessToken(token);
  const user = await prisma.user.findUnique({ where: { id: claims.userId } });
  if (!user || user.tokenVersion !== claims.version)
    throw unauthorized(
      "You've been signed out. Please sign in again.",
      "session_revoked",
    );
  req.user = user;
  req.authMethod = "token";
}

async function loadCookieUser(req, res) {
  const session = readSessionValue(readCookie(req, SESSION_COOKIE));
  if (!session) return;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (user && isValidSignature(session, user)) {
    req.user = user;
    req.authMethod = "cookie";
  } else clearSessionCookie(res);
}

export async function loadUser(req, res, next) {
  const token = readBearerToken(req);
  if (token) await loadTokenUser(req, token);
  else await loadCookieUser(req, res);
  next();
}

export function requireUser(req, res, next) {
  if (!req.user) return next(new HttpError(401, "Please sign in to continue."));
  next();
}

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user)
      return next(new HttpError(401, "Please sign in to continue."));
    if (!roles.includes(req.user.role))
      return next(new HttpError(403, "You don't have access to this page."));
    next();
  };
