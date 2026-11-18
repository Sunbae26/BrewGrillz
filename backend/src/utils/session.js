import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

export const SESSION_COOKIE = "brewgrillz_session";

const credentialStamp = (user) =>
  user.tokenVersion
    ? `${user.passwordHash.slice(-16)}.v${user.tokenVersion}`
    : user.passwordHash.slice(-16);

const signature = (userId, expires, user) =>
  createHmac("sha256", env.SESSION_SECRET)
    .update(`${userId}.${expires}.${credentialStamp(user)}`)
    .digest("base64url");

export const isTeamRole = (role) => role === "STAFF" || role === "ADMIN";

export const sessionLengthMs = (user) =>
  isTeamRole(user.role)
    ? env.STAFF_SESSION_HOURS * 60 * 60 * 1000
    : env.SESSION_DAYS * 24 * 60 * 60 * 1000;

export function createSessionValue(user) {
  const expires = Date.now() + sessionLengthMs(user);
  return {
    value: `${user.id}.${expires}.${signature(user.id, expires, user)}`,
    expires: new Date(expires),
  };
}

export function readSessionValue(value) {
  const [id, expires, sig] = String(value ?? "").split(".");
  const userId = Number(id);
  if (!Number.isInteger(userId) || !sig || Number(expires) < Date.now())
    return null;
  return { userId, expires: Number(expires), sig };
}

export function isValidSignature(session, user) {
  const expected = Buffer.from(
    signature(session.userId, session.expires, user),
  );
  const received = Buffer.from(session.sig);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export function readCookie(req, name) {
  const header = req.headers.cookie ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: env.isProduction,
  path: "/",
});

export function setSessionCookie(res, user) {
  const { value, expires } = createSessionValue(user);
  res.cookie(SESSION_COOKIE, value, { ...cookieOptions(), expires });
}

export const clearSessionCookie = (res) =>
  res.clearCookie(SESSION_COOKIE, cookieOptions());
