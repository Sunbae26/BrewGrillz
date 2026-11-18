import { prisma } from "../../lib/prisma.js";
import { addDays, singaporeInstant, singaporeParts } from "../../utils/singapore-time.js";

const COUNTED = ["PLACED", "PREPARING", "READY", "COMPLETED"];

// Online pickup sales, top dishes and table bookings for the last N days (Singapore time).
export async function salesReport(days) {
  const { date: today } = singaporeParts();
  const firstDay = addDays(today, -(days - 1));
  const start = singaporeInstant(firstDay, 0);
  const end = singaporeInstant(addDays(today, 1), 0);
  const [orders, bookings, members] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: COUNTED }, paidAt: { not: null }, createdAt: { gte: start, lt: end } },
      select: { totalCents: true, discountCents: true, userId: true, createdAt: true, items: { select: { nameSnapshot: true, quantity: true, lineTotalCents: true } } },
    }),
    prisma.reservation.findMany({
      where: { startsAt: { gte: start, lt: end }, status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] } },
      select: { partySize: true, status: true },
    }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: start, lt: end } } }),
  ]);

  const byDay = new Map(Array.from({ length: days }, (_, i) => [addDays(firstDay, i), { revenueCents: 0, orders: 0 }]));
  const dishes = new Map();
  for (const order of orders) {
    const day = byDay.get(singaporeParts(order.createdAt).date);
    if (day) {
      day.revenueCents += order.totalCents;
      day.orders += 1;
    }
    for (const item of order.items) {
      const entry = dishes.get(item.nameSnapshot) ?? { name: item.nameSnapshot, quantity: 0, revenueCents: 0 };
      entry.quantity += item.quantity;
      entry.revenueCents += item.lineTotalCents;
      dishes.set(item.nameSnapshot, entry);
    }
  }
  const revenueCents = orders.reduce((sum, o) => sum + o.totalCents, 0);
  return {
    days,
    revenueCents,
    orders: orders.length,
    averageCents: orders.length ? Math.round(revenueCents / orders.length) : 0,
    discountCents: orders.reduce((sum, o) => sum + o.discountCents, 0),
    memberOrders: orders.filter((o) => o.userId).length,
    newMembers: members,
    bookings: {
      count: bookings.length,
      guests: bookings.reduce((sum, b) => sum + b.partySize, 0),
      noShows: bookings.filter((b) => b.status === "NO_SHOW").length,
    },
    daily: [...byDay.entries()].map(([date, value]) => ({ date, ...value })),
    topDishes: [...dishes.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
  };
}
