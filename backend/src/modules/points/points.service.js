import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/http-error.js";

export const pointsRules = () => ({
  pointsPerDollar: env.POINTS_PER_DOLLAR,
  redeemBlock: env.POINTS_REDEEM_BLOCK,
  redeemValueCents: env.POINTS_REDEEM_VALUE_CENTS,
});

export async function pointsBalance(userId, client = prisma) {
  const { _sum } = await client.pointsEntry.aggregate({
    where: { userId },
    _sum: { points: true },
  });
  return _sum.points ?? 0;
}

export function discountForPoints(points, subtotalCents) {
  if (!points) return 0;
  if (points % env.POINTS_REDEEM_BLOCK !== 0)
    throw new HttpError(
      400,
      `Points can be used in blocks of ${env.POINTS_REDEEM_BLOCK}.`,
    );
  const discount =
    (points / env.POINTS_REDEEM_BLOCK) * env.POINTS_REDEEM_VALUE_CENTS;
  if (discount > subtotalCents)
    throw new HttpError(400, "That's more points than this order needs.");
  return discount;
}

export async function reservePoints(tx, userId, points, orderId) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
  const balance = await pointsBalance(userId, tx);
  if (balance < points)
    throw new HttpError(
      409,
      `You have ${balance} points, which isn't enough for this discount.`,
    );
  await tx.pointsEntry.create({
    data: {
      userId,
      orderId,
      type: "REDEEM",
      points: -points,
      note: "Used on order",
    },
  });
}

export async function earnForOrder(orderId) {
  return prisma.$transaction(async (tx) => {
    const [order] = await tx.$queryRaw`SELECT id, code, "userId", "paidAt", "totalCents" FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    if (!order?.userId || !order.paidAt) return 0;
    const already = await tx.pointsEntry.count({
      where: { orderId, type: "EARN" },
    });
    if (already) return 0;
    const points = Math.floor(order.totalCents / 100) * env.POINTS_PER_DOLLAR;
    if (points > 0)
      await tx.pointsEntry.create({
        data: {
          userId: order.userId,
          orderId,
          type: "EARN",
          points,
          note: `Earned on order ${order.code}`,
        },
      });
    return points;
  });
}

export async function reverseForOrder(orderId, client = prisma) {
  const entries = await client.pointsEntry.findMany({
    where: { orderId, type: { in: ["EARN", "REDEEM", "REVERSAL"] } },
  });
  const net = entries.reduce((sum, entry) => sum + entry.points, 0);
  if (net === 0 || !entries[0]) return 0;
  await client.pointsEntry.create({
    data: {
      userId: entries[0].userId,
      orderId,
      type: "REVERSAL",
      points: -net,
      note: "Reversed because the order was cancelled",
    },
  });
  return -net;
}

export async function pointsHistory(userId) {
  const [balance, entries] = await Promise.all([
    pointsBalance(userId),
    prisma.pointsEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        type: true,
        points: true,
        note: true,
        createdAt: true,
        order: { select: { code: true } },
      },
    }),
  ]);
  return {
    balance,
    rules: pointsRules(),
    entries: entries.map((entry) => ({
      ...entry,
      orderCode: entry.order?.code ?? null,
      order: undefined,
    })),
  };
}

// Staff add points for a dine-in bill (or correct a balance) from the dashboard.
export async function adjustPoints({ userId, points, note, addedBy }) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const balance = await pointsBalance(userId, tx);
    if (balance + points < 0) throw new HttpError(400, `That would take the balance below zero (it's ${balance}).`);
    await tx.pointsEntry.create({ data: { userId, type: "ADJUSTMENT", points, note, addedBy } });
    return balance + points;
  });
}

export const pointsForBill = (cents) => Math.floor(cents / 100) * env.POINTS_PER_DOLLAR;
