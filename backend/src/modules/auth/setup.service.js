import { timingSafeEqual } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/http-error.js";
import { hashPassword } from "../../utils/password.js";

const keyRequired = () => env.isProduction;

function matchesKey(given) {
  if (!keyRequired()) return true;
  if (!env.ADMIN_SETUP_KEY)
    throw new HttpError(
      503,
      "Owner setup is locked. Add ADMIN_SETUP_KEY to the backend settings first.",
    );
  const expected = Buffer.from(env.ADMIN_SETUP_KEY);
  const received = Buffer.from(String(given ?? ""));
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export async function setupStatus() {
  const admins = await prisma.user.count({ where: { role: "ADMIN" } });
  return { needsSetup: admins === 0, setupKeyRequired: keyRequired() };
}

export async function createOwner({ name, email, password, setupKey }) {
  if (!matchesKey(setupKey))
    throw new HttpError(403, "The setup key is incorrect.");
  const passwordHash = await hashPassword(password);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(424242)`;
    if ((await tx.user.count({ where: { role: "ADMIN" } })) > 0)
      throw new HttpError(
        409,
        "The owner account already exists. Sign in instead.",
      );
    return tx.user.upsert({
      where: { email },
      create: { name, email, passwordHash, role: "ADMIN", isOwner: true },
      update: {
        name,
        passwordHash,
        role: "ADMIN",
        isOwner: true,
        tokenVersion: { increment: 1 },
      },
    });
  });
}
