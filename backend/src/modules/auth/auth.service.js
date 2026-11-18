import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/http-error.js";
import {
  burnPasswordCheck,
  hashPassword,
  needsRehash,
  verifyPassword,
} from "../../utils/password.js";
import { sendEmail } from "../email/email.service.js";
import { passwordResetEmail, welcomeEmail } from "../email/templates.js";
import { whatsappEnabled } from "../whatsapp/whatsapp.service.js";
import { pointsBalance, pointsRules } from "../points/points.service.js";

const RESET_MINUTES = 60;
const RESET_COOLDOWN_MINUTES = 2;
const RESET_MAX_PER_HOUR = 5;
const hashToken = (token) => createHash("sha256").update(token).digest("hex");

export async function publicUser(user) {
  if (!user) return null;
  return {
    name: user.name,
    email: user.email,
    phone: user.phone,
    whatsappOptIn: Boolean(user.whatsappOptIn),
    role: user.role,
    isOwner: Boolean(user.isOwner),
    points: { balance: await pointsBalance(user.id), ...pointsRules() },
  };
}

export async function register({ name, email, phone, password, whatsapp }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    throw new HttpError(
      409,
      "An account with this email already exists. Sign in instead.",
    );
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      whatsappOptIn: Boolean(whatsapp && phone) && whatsappEnabled(),
      passwordHash: await hashPassword(password),
    },
  });
  sendEmail({ to: user.email, ...welcomeEmail(user) }).catch((error) =>
    console.error("Welcome email failed:", error.message),
  );
  return user;
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user
    ? await verifyPassword(password, user.passwordHash)
    : await burnPasswordCheck(password);
  if (!user || !valid)
    throw new HttpError(401, "Email or password is incorrect.");
  if (!needsRehash(user.passwordHash)) return user;
  return prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password) },
  });
}

export const resetLink = (token) => `${env.SITE_URL}/reset-password?token=${token}`;

export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  const hourAgo = new Date(Date.now() - 60 * 60_000);
  const recent = await prisma.passwordResetToken.findMany({
    where: { userId: user.id, createdAt: { gte: hourAgo } },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  if (
    recent.length >= RESET_MAX_PER_HOUR ||
    (recent[0] &&
      Date.now() - recent[0].createdAt.getTime() <
        RESET_COOLDOWN_MINUTES * 60_000)
  )
    return;
  const token = randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000),
    },
  });
  const message = passwordResetEmail(user.name, resetLink(token));
  await sendEmail({ to: user.email, ...message }).catch((error) =>
    console.error("Password reset email failed:", error.message),
  );
}

export async function resetPassword({ token, password }) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new HttpError(
      400,
      "This reset link has expired or was already used. Ask for a new one.",
    );
  }
  const passwordHash = await hashPassword(password);
  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);
  return user;
}
