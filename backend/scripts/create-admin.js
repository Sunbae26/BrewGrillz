import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/utils/password.js";

const [email, name, password, roleArg] = process.argv.slice(2);
const role = (roleArg ?? "ADMIN").toUpperCase();

if (
  !email ||
  !name ||
  !password ||
  !["ADMIN", "STAFF"].includes(role) ||
  password.length < 8
) {
  console.log(
    'Usage: npm run admin:create -- you@example.com "Your Name" "a-strong-password" [ADMIN|STAFF]',
  );
  console.log(
    "The password needs at least 8 characters. ADMIN also manages prices, refunds, settings, the team and reports. STAFF runs orders, bookings and the menu.",
  );
  process.exit(1);
}

const normalized = email.trim().toLowerCase();
const passwordHash = await hashPassword(password);
const ownerExists =
  (await prisma.user.count({ where: { isOwner: true } })) > 0;
const isOwner = role === "ADMIN" && !ownerExists;
const existing = await prisma.user.findUnique({ where: { email: normalized } });
if (existing?.isOwner && role !== "ADMIN") {
  console.error("This account is the owner. Its access can't be lowered.");
  process.exit(1);
}
const user = await prisma.user.upsert({
  where: { email: normalized },
  create: { email: normalized, name, passwordHash, role, isOwner },
  update: {
    name,
    passwordHash,
    role,
    ...(isOwner ? { isOwner } : {}),
    tokenVersion: { increment: 1 },
  },
});

console.log(
  `${user.name} (${user.email}) is now ${user.isOwner ? "the OWNER" : role}. Sign in at /admin/login.`,
);
await prisma.$disconnect();
