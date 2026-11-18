import { prisma } from "../../lib/prisma.js";
import { notFound } from "../../utils/http-error.js";
import { adjustPoints, pointsBalance, pointsForBill } from "../points/points.service.js";

// Rewards Club members, found by name, email or mobile (for adding points to a dine-in bill).
export async function findMembers(q) {
  const term = q.trim();
  const digits = term.replace(/\D/g, "");
  const users = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      OR: [
        { email: { contains: term, mode: "insensitive" } },
        { name: { contains: term, mode: "insensitive" } },
        ...(digits.length >= 4 ? [{ phone: { contains: digits.slice(-8) } }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });
  return Promise.all(users.map(async (u) => ({ ...u, balance: await pointsBalance(u.id) })));
}

export async function addPoints(memberId, { billCents, points, note }, actor) {
  const member = await prisma.user.findFirst({ where: { id: memberId, role: "CUSTOMER" } });
  if (!member) throw notFound("Member not found");
  const amount = points ?? pointsForBill(billCents);
  const label = note || (billCents ? `Dine-in bill S$${(billCents / 100).toFixed(2)}` : "Adjusted by staff");
  const balance = await adjustPoints({ userId: member.id, points: amount, note: label, addedBy: actor.name });
  return { memberId: member.id, added: amount, balance };
}
