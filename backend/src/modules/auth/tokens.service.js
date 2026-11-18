import { createHash, randomBytes, randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { unauthorized } from "../../utils/http-error.js";
import { signAccessToken } from "../../utils/jwt.js";
import { isTeamRole } from "../../utils/session.js";

const DAY = 24 * 60 * 60 * 1000;
const REPLACED_KEEP_DAYS = 14;
const REVOKED_KEEP_DAYS = 7;

const hashToken = (token) => createHash("sha256").update(token).digest("hex");

const signedOut = () =>
  unauthorized(
    "You've been signed out. Please sign in again.",
    "session_revoked",
  );

export const wantsAppTokens = (req) =>
  String(req.get("x-brewgrillz-client") ?? "").toLowerCase() === "app";

export const deviceName = (req) =>
  String(req.get("x-brewgrillz-device") ?? "")
    .replace(/[^\p{L}\p{N} ._()'-]/gu, "")
    .trim()
    .slice(0, 80) || null;

export async function issueTokens(user, { familyId, device } = {}) {
  const refreshToken = randomBytes(48).toString("base64url");
  const refreshExpiresAt = new Date(
    Date.now() +
      (isTeamRole(user.role)
        ? env.STAFF_SESSION_HOURS * 60 * 60 * 1000
        : env.REFRESH_TOKEN_DAYS * DAY),
  );
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      familyId: familyId ?? randomUUID(),
      tokenVersion: user.tokenVersion,
      deviceName: device ?? null,
      expiresAt: refreshExpiresAt,
      userId: user.id,
    },
  });
  const access = await signAccessToken(user);
  return {
    tokenType: "Bearer",
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt.toISOString(),
    expiresIn: env.JWT_ACCESS_MINUTES * 60,
    refreshToken,
    refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
  };
}

const revokeFamily = (familyId) =>
  prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

export async function rotateRefreshToken(refreshToken, device) {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: true },
  });
  if (!record) throw signedOut();

  const now = new Date();
  if (record.revokedAt || record.replacedAt) {
    await revokeFamily(record.familyId);
    throw signedOut();
  }
  if (
    record.expiresAt < now ||
    record.tokenVersion !== record.user.tokenVersion
  ) {
    await revokeFamily(record.familyId);
    throw signedOut();
  }

  const claimed = await prisma.refreshToken.updateMany({
    where: { id: record.id, replacedAt: null, revokedAt: null },
    data: { replacedAt: now, lastUsedAt: now },
  });
  if (claimed.count !== 1) {
    await revokeFamily(record.familyId);
    throw signedOut();
  }

  const tokens = await issueTokens(record.user, {
    familyId: record.familyId,
    device: device ?? record.deviceName,
  });
  return { user: record.user, tokens };
}

export async function revokeRefreshToken(refreshToken) {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    select: { familyId: true },
  });
  if (record) await revokeFamily(record.familyId);
}

export async function signOutEverywhere(userId) {
  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  return user;
}

export async function pruneRefreshTokens() {
  const now = Date.now();
  const { count } = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date(now) } },
        { revokedAt: { lt: new Date(now - REVOKED_KEEP_DAYS * DAY) } },
        { replacedAt: { lt: new Date(now - REPLACED_KEEP_DAYS * DAY) } },
      ],
    },
  });
  return count;
}
