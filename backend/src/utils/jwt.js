import { randomUUID } from "node:crypto";
import { SignJWT, errors, jwtVerify } from "jose";
import { env } from "../config/env.js";
import { unauthorized } from "./http-error.js";

const ISSUER = "brewgrillz-api";
const AUDIENCE = "brewgrillz-app";
const key = new TextEncoder().encode(env.JWT_SECRET);

export async function signAccessToken(user) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + env.JWT_ACCESS_MINUTES * 60;
  const token = await new SignJWT({ ver: user.tokenVersion, role: user.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(user.id))
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .setJti(randomUUID())
    .sign(key);
  return { token, expiresAt: new Date(expiresAt * 1000) };
}

export async function verifyAccessToken(token) {
  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
      requiredClaims: ["sub", "exp", "ver"],
    });
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || !Number.isInteger(payload.ver))
      throw new errors.JWTInvalid("Malformed claims");
    return { userId, version: payload.ver };
  } catch (error) {
    if (error instanceof errors.JWTExpired)
      throw unauthorized(
        "Your sign-in has expired. Refresh it and try again.",
        "token_expired",
      );
    throw unauthorized("This sign-in token isn't valid.", "token_invalid");
  }
}

export function readBearerToken(req) {
  const header = req.get("authorization")?.trim();
  if (!header || !/^bearer\s/i.test(header)) return null;
  const match =
    /^Bearer\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(header);
  if (!match)
    throw unauthorized(
      "Send the access token as: Authorization: Bearer <token>.",
      "token_invalid",
    );
  return match[1];
}
