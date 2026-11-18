import { prisma } from "../../lib/prisma.js";
import { HttpError, notFound } from "../../utils/http-error.js";
import { activeProvider, providerFor } from "../payments/providers/index.js";
import { invalidateMenu } from "../menu/menu.service.js";
import { notifyRefund, notifyStatus, OPEN_STATUSES } from "../orders/orders.service.js";
import { reverseForOrder } from "../points/points.service.js";
import { addDays, singaporeInstant, singaporeParts } from "../../utils/singapore-time.js";

// The kitchen moves an order one step at a time.
const NEXT = { PLACED: "PREPARING", PREPARING: "READY", READY: "COMPLETED" };

const staffShape = (order) => ({
  id: order.id,
  code: order.code,
  status: order.status,
  customerName: order.customerName,
  customerPhone: order.customerPhone,
  customerEmail: order.customerEmail,
  pickupAt: order.scheduledFor,
  notes: order.notes,
  totalCents: order.totalCents,
  refundedCents: order.refundedCents,
  paymentProvider: order.paymentProvider,
  paidAt: order.paidAt,
  discountCents: order.discountCents,
  pointsRedeemed: order.pointsRedeemed,
  member: Boolean(order.userId),
  createdAt: order.createdAt,
  items: order.items.map((i) => ({
    name: i.nameSnapshot,
    variant: i.variant,
    options: i.options,
    notes: i.notes,
    quantity: i.quantity,
    lineTotalCents: i.lineTotalCents,
  })),
});

export async function listOrders({ status }) {
  const orders = await prisma.order.findMany({
    where: status ? { status } : { status: { not: "PENDING_PAYMENT" } },
    orderBy: [{ scheduledFor: "asc" }],
    include: { items: { orderBy: { id: "asc" } } },
    take: 200,
  });
  return orders.map(staffShape);
}

// The order board: everything still to cook or collect, plus what finished today.
export async function boardOrders() {
  const { date } = singaporeParts();
  const start = singaporeInstant(date, 0);
  const end = singaporeInstant(addDays(date, 1), 0);
  const include = { items: { orderBy: { id: "asc" } } };
  const [active, done] = await Promise.all([
    prisma.order.findMany({ where: { status: { in: OPEN_STATUSES } }, orderBy: { scheduledFor: "asc" }, include }),
    prisma.order.findMany({
      where: {
        status: { in: ["COMPLETED", "CANCELLED", "REFUNDED"] },
        scheduledFor: { gte: start, lt: end },
        NOT: { status: "CANCELLED", paidAt: null },
      },
      orderBy: { updatedAt: "desc" },
      take: 40,
      include,
    }),
  ]);
  return { active: active.map(staffShape), done: done.map(staffShape) };
}

async function load(code) {
  const order = await prisma.order.findUnique({ where: { code } });
  if (!order) throw notFound("Order not found");
  return order;
}

export async function advanceOrder(code, to) {
  const order = await load(code);
  to ??= NEXT[order.status];
  if (!to || NEXT[order.status] !== to)
    throw new HttpError(409, `An order that is ${order.status.toLowerCase()} can't move to ${to.toLowerCase()}.`);
  const { count } = await prisma.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: to } });
  if (!count) throw new HttpError(409, "Someone else just updated this order. Refresh and try again.");
  await prisma.orderEvent.create({ data: { orderId: order.id, status: to } });
  notifyStatus(order.id, to).catch((error) => console.error("Status notification failed:", error));
  return { code, status: to };
}

export async function cancelOrder(code, { reason }) {
  const order = await load(code);
  if (!OPEN_STATUSES.includes(order.status))
    throw new HttpError(409, `An order that is ${order.status.toLowerCase()} can't be cancelled.`);
  const count = await prisma.$transaction(async (tx) => {
    const { count: changed } = await tx.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: "CANCELLED" } });
    if (changed) await reverseForOrder(order.id, tx);
    return changed;
  });
  if (!count) throw new HttpError(409, "Someone else just updated this order. Refresh and try again.");
  await prisma.orderEvent.create({ data: { orderId: order.id, status: "CANCELLED", note: reason ?? null } });
  const refundDue = Boolean(order.paidAt) && order.refundedCents < order.totalCents;
  notifyStatus(order.id, "CANCELLED", { refundDue }).catch((error) => console.error("Cancel notification failed:", error));
  return { code, status: "CANCELLED", refundDue };
}

// Partial or full refund through the payment provider.
export async function refundOrder(code, { amountCents }) {
  const order = await load(code);
  if (!order.paidAt || !order.providerPaymentId) throw new HttpError(409, "This order wasn't paid online, so there is nothing to refund.");
  const left = order.totalCents - order.refundedCents;
  if (left <= 0) throw new HttpError(409, "This order has already been fully refunded.");
  const amount = amountCents ?? left;
  if (amount > left) throw new HttpError(400, `You can refund at most S$${(left / 100).toFixed(2)}.`);
  const provider = providerFor(order.paymentProvider) ?? activeProvider();
  const refund = await provider.refund(order.providerPaymentId, amount, order.code);
  const refundedCents = order.refundedCents + amount;
  const full = refundedCents >= order.totalCents;
  await prisma.order.update({
    where: { id: order.id },
    data: { refundedCents, ...(full ? { status: "REFUNDED" } : {}) },
  });
  await prisma.orderEvent.create({
    data: { orderId: order.id, status: full ? "REFUNDED" : order.status, note: `Refunded S$${(amount / 100).toFixed(2)}` },
  });
  if (full) await reverseForOrder(order.id);
  notifyRefund(order.id, { amountCents: amount, full }).catch((error) =>
    console.error("Refund notification failed:", error),
  );
  return { code, refundedCents, full, refundId: refund.refundId };
}

// Sold-out switch for a dish or drink.
export async function setAvailability(slug, isAvailable) {
  const data = { isAvailable, staffEditedAt: new Date() };
  const item = await prisma.menuItem.updateMany({ where: { slug }, data });
  const drink = item.count ? { count: 0 } : await prisma.drink.updateMany({ where: { slug }, data });
  if (!item.count && !drink.count) throw notFound("Dish not found");
  invalidateMenu();
  return { slug, isAvailable };
}
