import { randomInt } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { reportError } from "../../lib/monitoring.js";
import { alertStaff } from "../../lib/alerts.js";
import { HttpError, notFound } from "../../utils/http-error.js";
import { isValidOrderToken, orderToken } from "../../utils/order-token.js";
import { formatPickup, singaporeParts } from "../../utils/singapore-time.js";
import { activeProvider, providerFor } from "../payments/providers/index.js";
import { sendEmail } from "../email/email.service.js";
import {
  customerReceipt,
  orderCancelledEmail,
  orderPreparingEmail,
  orderReadyEmail,
  orderRefundedEmail,
  restaurantNotification,
} from "../email/templates.js";
import { whatsappOrder } from "../whatsapp/notify.js";
import { whatsappEnabled } from "../whatsapp/whatsapp.service.js";
import { getOperations } from "../settings/settings.service.js";
import { countOrdersAt, isValidPickup } from "./pickup.service.js";
import { discountForPoints, earnForOrder, reservePoints, reverseForOrder } from "../points/points.service.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PROCESSING_GIVE_UP_MS = 24 * 60 * 60_000;
export const MIN_ONLINE_CENTS = 50;
export const OPEN_STATUSES = ["PLACED", "PREPARING", "READY"];

const orderInclude = {
  items: { orderBy: { id: "asc" } },
  events: { orderBy: { createdAt: "asc" } },
};

const money = (cents) => `S$${(cents / 100).toFixed(2)}`;

function newCode() {
  const { date } = singaporeParts();
  const suffix = Array.from(
    { length: 4 },
    () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
  ).join("");
  return `BG-${date.slice(2).replace(/-/g, "")}-${suffix}`;
}

export const orderLink = (code) =>
  `${env.SITE_URL}/order/${code}?t=${orderToken(code)}`;

// An unpaid order holds its pickup slot until this time.
export function paymentDeadline(order) {
  return new Date(
    Math.min(
      order.createdAt.getTime() + env.PENDING_ORDER_EXPIRY_MINUTES * 60_000,
      order.scheduledFor.getTime(),
    ),
  );
}

// ---------- pricing (always on the server, from the database) ----------

const cartError = (message, code = "CART") => new HttpError(400, message, { code });

async function priceCart(lines) {
  const slugs = [...new Set(lines.map((line) => line.slug))];
  const [items, drinks] = await Promise.all([
    prisma.menuItem.findMany({ where: { slug: { in: slugs }, isActive: true } }),
    prisma.drink.findMany({
      where: { slug: { in: slugs }, isActive: true },
      include: { section: { include: { category: true } } },
    }),
  ]);
  const itemBySlug = new Map(items.map((item) => [item.slug, item]));
  const drinkBySlug = new Map(drinks.map((drink) => [drink.slug, drink]));

  const priced = lines.map((line) => {
    const item = itemBySlug.get(line.slug);
    const drink = drinkBySlug.get(line.slug);
    const notes = line.notes?.trim().slice(0, 140) || null;

    if (drink) {
      if (!drink.section.category.orderable)
        throw cartError(`${drink.name}: alcoholic drinks are dine-in only. Please remove it from your order.`, "DINE_IN_ONLY");
      if (!drink.isAvailable) throw cartError(`${drink.name} is sold out. Please remove it from your order.`, "SOLD_OUT");
      const unitPriceCents = drink.prices.find((price) => price != null);
      if (unitPriceCents == null) throw cartError(`${drink.name} can't be ordered online.`);
      return {
        line,
        data: {
          quantity: line.quantity,
          nameSnapshot: drink.name,
          variant: null,
          options: undefined,
          notes,
          unitPriceCents,
          lineTotalCents: unitPriceCents * line.quantity,
          drinkId: drink.id,
        },
      };
    }

    if (!item) throw cartError("Something in your order is no longer on the menu. Please remove it and try again.", "UNKNOWN_ITEM");
    if (!item.isAvailable) throw cartError(`${item.name} is sold out. Please remove it from your order.`, "SOLD_OUT");

    let unitPriceCents = item.priceCents;
    let variant = null;
    if (item.variants?.length) {
      const chosen = item.variants.find((v) => v.name === line.variant);
      if (!chosen) throw cartError(`Please choose a size for ${item.name}.`);
      unitPriceCents = chosen.priceCents;
      variant = chosen.name;
    } else if (line.variant) throw cartError(`${item.name} has no sizes to choose from.`);

    const groups = item.options ?? [];
    const given = line.options ?? {};
    for (const name of Object.keys(given))
      if (!groups.some((group) => group.name === name)) throw cartError(`${item.name} has no "${name}" choice.`);
    for (const group of groups)
      if (!group.choices.includes(given[group.name]))
        throw cartError(`Please choose a ${group.name.toLowerCase()} for ${item.name}.`);

    return {
      line,
      data: {
        quantity: line.quantity,
        nameSnapshot: item.name,
        variant,
        options: groups.length ? Object.fromEntries(groups.map((g) => [g.name, given[g.name]])) : undefined,
        notes,
        unitPriceCents,
        lineTotalCents: unitPriceCents * line.quantity,
        menuItemId: item.id,
      },
    };
  });

  const subtotalCents = priced.reduce((sum, p) => sum + p.data.lineTotalCents, 0);
  return { priced, subtotalCents };
}

// ---------- notifications (best effort: never break an order) ----------

const loadForNotify = (orderId) =>
  prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });

async function emailAll(messages) {
  const results = await Promise.allSettled(messages.map((m) => sendEmail(m)));
  for (const result of results)
    if (result.status === "rejected")
      console.error("Order email failed:", result.reason?.message ?? result.reason);
}

async function notifyPlaced(orderId) {
  const order = await loadForNotify(orderId);
  const link = orderLink(order.code);
  whatsappOrder.placed(order, link);
  await emailAll([
    { to: order.customerEmail, ...customerReceipt(order, link) },
    { to: env.RESTAURANT_EMAIL, ...restaurantNotification(order) },
  ]);
}

export async function notifyStatus(orderId, status, extra = {}) {
  const order = await loadForNotify(orderId);
  const link = orderLink(order.code);
  if (status === "PREPARING") {
    whatsappOrder.preparing(order, link);
    await emailAll([{ to: order.customerEmail, ...orderPreparingEmail(order, link) }]);
  }
  if (status === "READY") {
    whatsappOrder.ready(order, link);
    await emailAll([{ to: order.customerEmail, ...orderReadyEmail(order, link) }]);
  }
  if (status === "CANCELLED") {
    whatsappOrder.cancelled(order, extra.refundDue);
    await emailAll([{ to: order.customerEmail, ...orderCancelledEmail(order, extra) }]);
  }
}

export async function notifyRefund(orderId, { amountCents, full }) {
  const order = await loadForNotify(orderId);
  await emailAll([{ to: order.customerEmail, ...orderRefundedEmail(order, { amountCents, full }) }]);
}

const event = (orderId, status, note) =>
  prisma.orderEvent.create({ data: { orderId, status, note: note ?? null } });

// ---------- creating an order ----------

const respond = (order, payment) => ({
  order: { code: order.code, totalCents: order.totalCents, token: orderToken(order.code) },
  payment,
});

const slotFull = () =>
  new HttpError(409, "That pickup time just filled up. Please choose another.", { code: "SLOT_FULL" });

async function insertOrder(data, slotCapacity, points = 0) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        if (slotCapacity) {
          // one checkout at a time per slot, so a busy slot can't be overbooked
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`pickup:${data.scheduledFor.toISOString()}`}))`;
          if ((await countOrdersAt(tx, data.scheduledFor)) >= slotCapacity) throw slotFull();
        }
        const order = await tx.order.create({ data: { ...data, code: newCode() } });
        await tx.orderEvent.create({ data: { orderId: order.id, status: "PENDING_PAYMENT" } });
        if (points) await reservePoints(tx, data.userId, points, order.id);
        return order;
      });
    } catch (error) {
      if (error.code !== "P2002") throw error;
      if (String(error.meta?.target ?? error.message).includes("idempotencyKey")) return null;
      // order code clash: try again with a new code
    }
  }
  throw new HttpError(503, "Could not create your order. Please try again.");
}

// The same "Pay" press (same idempotency key) must describe the same order.
const normaliseOptions = (options) =>
  Object.entries(options ?? {})
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("&");

const requestFingerprint = (input) =>
  JSON.stringify({
    items: input.items
      .map((line) => `${line.slug}|${line.variant ?? ""}|${normaliseOptions(line.options)}|${line.quantity}`)
      .sort(),
    pickupAt: new Date(input.pickupAt).toISOString(),
    points: input.pointsToRedeem ?? 0,
  });

const orderFingerprint = (order) =>
  JSON.stringify({
    items: order.items
      .map((item) => `${item.menuItem?.slug ?? item.drink?.slug}|${item.variant ?? ""}|${normaliseOptions(item.options)}|${item.quantity}`)
      .sort(),
    pickupAt: order.scheduledFor.toISOString(),
    points: order.pointsRedeemed,
  });

const fingerprintInclude = {
  items: {
    include: { menuItem: { select: { slug: true } }, drink: { select: { slug: true } } },
  },
};

const orderExpired = () =>
  new HttpError(409, "This payment session has expired. Please press pay again to place a fresh order.", {
    code: "ORDER_EXPIRED",
  });

async function cancelUnpaid(orderId) {
  const count = await prisma.$transaction(async (tx) => {
    const { count: changed } = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING_PAYMENT" },
      data: { status: "CANCELLED" },
    });
    // points held for this order go back to the member
    if (changed) await reverseForOrder(orderId, tx);
    return changed;
  });
  if (count) await event(orderId, "CANCELLED", "Payment not completed");
  return count;
}

// Before giving up on an unpaid order, ask the payment provider whether it was paid after all.
async function settleUnpaid(order) {
  const provider = providerFor(order.paymentProvider);
  const state =
    provider?.cancel && order.providerOrderId ? await provider.cancel(order) : { state: "expired" };
  if (state.state === "paid") {
    await markPaid({
      where: { id: order.id },
      paymentId: state.paymentId,
      amountCents: state.amountCents,
      currency: state.currency,
    });
    return "paid";
  }
  if (state.state === "pending" && Date.now() - order.createdAt.getTime() < PROCESSING_GIVE_UP_MS)
    return "processing";
  if (state.state === "pending")
    await alertStaff({
      subject: `Payment for ${order.code} never finished processing`,
      lines: [
        `The ${order.paymentProvider} payment for ${order.code} (${money(order.totalCents)}) was still processing after 24 hours, so the order was cancelled.`,
        "Check the payment dashboard. If money arrives later, refund the customer.",
      ],
      key: `stuck:${order.code}`,
    });
  return (await cancelUnpaid(order.id)) ? "cancelled" : "unchanged";
}

async function resumeExisting(existing, input) {
  if (orderFingerprint(existing) !== requestFingerprint(input))
    throw new HttpError(409, "Your order changed since you last tried to pay. Please press pay again.", {
      code: "ORDER_CHANGED",
    });
  if (existing.status === "CANCELLED" || existing.status === "REFUNDED") throw orderExpired();
  if (existing.status !== "PENDING_PAYMENT")
    return respond(existing, { provider: existing.paymentProvider, alreadyPaid: true });
  if (paymentDeadline(existing) <= new Date()) {
    const outcome = await settleUnpaid(existing);
    if (outcome === "paid" || outcome === "processing")
      return respond(existing, { provider: existing.paymentProvider, alreadyPaid: true });
    throw orderExpired();
  }
  const provider = providerFor(existing.paymentProvider) ?? activeProvider();
  if (existing.providerOrderId && provider.describe) {
    const state = await provider.describe(existing);
    if (state.state === "paid") {
      await markPaid({
        where: { id: existing.id },
        paymentId: state.paymentId,
        amountCents: state.amountCents,
        currency: state.currency,
      });
      return respond(existing, { provider: provider.name, alreadyPaid: true });
    }
    if (state.state === "pending") return respond(existing, { provider: provider.name, alreadyPaid: true });
    if (state.state === "open") return respond(existing, state.client);
  }
  const { providerOrderId, client } = await provider.createPayment(existing, {
    deadline: paymentDeadline(existing),
  });
  const { count } = await prisma.order.updateMany({
    where: { id: existing.id, status: "PENDING_PAYMENT", providerOrderId: existing.providerOrderId },
    data: { paymentProvider: provider.name, providerOrderId },
  });
  if (!count) {
    await provider.cancel?.({ ...existing, providerOrderId }).catch((error) => reportError(error));
    const latest = await prisma.order.findUnique({ where: { id: existing.id }, include: fingerprintInclude });
    return resumeExisting(latest, input);
  }
  return respond(existing, client);
}

// Customer cancelled on Stripe and came back: close the old unpaid order (unless it was paid after all).
async function abandonReplacedOrder(replaces) {
  if (!replaces || !isValidOrderToken(replaces.code, replaces.token)) return;
  const order = await prisma.order.findUnique({ where: { code: replaces.code } });
  const keptPaid = () =>
    new HttpError(409, "Your earlier payment for this order went through, so we kept that order.", {
      code: "REPLACED_ORDER_PAID",
      order: replaces.code,
      token: replaces.token,
    });
  if (!order || order.status !== "PENDING_PAYMENT") {
    if (order?.paidAt) throw keptPaid();
    return;
  }
  const outcome = await settleUnpaid(order);
  if (outcome === "paid") throw keptPaid();
  if (outcome === "processing")
    throw new HttpError(409, "Your earlier payment is still being processed. Check that order before paying again.", {
      code: "REPLACED_ORDER_PROCESSING",
      order: replaces.code,
      token: replaces.token,
    });
}

export async function createOrder(input, user = null) {
  const existing = await prisma.order.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: fingerprintInclude,
  });
  if (existing) {
    if (existing.userId && existing.userId !== user?.id) throw new HttpError(409, "Please press pay again.", { code: "ORDER_CHANGED" });
    return resumeExisting(existing, input);
  }
  if (input.pointsToRedeem && !user) throw new HttpError(401, "Sign in to use your Rewards points.");

  const operations = await getOperations();
  if (operations.ordersPaused)
    throw new HttpError(
      409,
      operations.pausedMessage || "Online ordering is paused right now. Please try again a little later.",
      { code: "ORDERS_PAUSED" },
    );

  const pickupAt = new Date(input.pickupAt);
  const { priced, subtotalCents } = await priceCart(input.items);
  if (!(await isValidPickup(pickupAt)))
    throw new HttpError(409, "That pickup time is no longer available. Please choose another.", {
      code: "SLOT_UNAVAILABLE",
    });
  const pointsRedeemed = input.pointsToRedeem ?? 0;
  const discountCents = discountForPoints(pointsRedeemed, subtotalCents);
  const totalCents = subtotalCents - discountCents;
  if (totalCents < MIN_ONLINE_CENTS)
    throw new HttpError(400, pointsRedeemed ? `Use fewer points: at least ${money(MIN_ONLINE_CENTS)} has to be paid online.` : `Online orders must be at least ${money(MIN_ONLINE_CENTS)}.`);

  await abandonReplacedOrder(input.replaces);

  const order = await insertOrder(
    {
      idempotencyKey: input.idempotencyKey,
      customerName: input.customer.name,
      customerEmail: input.customer.email,
      customerPhone: input.customer.phone,
      whatsappOptIn: input.customer.whatsapp && whatsappEnabled(),
      scheduledFor: pickupAt,
      notes: input.notes || null,
      subtotalCents,
      discountCents,
      pointsRedeemed,
      totalCents,
      userId: user?.id ?? null,
      items: { create: priced.map((p) => p.data) },
    },
    operations.slotCapacity,
    pointsRedeemed,
  );
  if (!order) return createOrder(input, user);

  const provider = activeProvider();
  try {
    const { providerOrderId, client } = await provider.createPayment(order, {
      deadline: paymentDeadline(order),
    });
    const saved = await prisma.order.update({
      where: { id: order.id },
      data: { paymentProvider: provider.name, providerOrderId },
    });
    return respond(saved, client);
  } catch (error) {
    await prisma.order.update({ where: { id: order.id }, data: { paymentProvider: provider.name } }).catch(() => {});
    throw error;
  }
}

// ---------- payment results ----------

async function warnLatePayment(order) {
  if (order.scheduledFor.getTime() > Date.now()) return;
  await alertStaff({
    subject: `Order ${order.code} was paid after its pickup time`,
    lines: [
      `${order.customerName} paid ${money(order.totalCents)} for a pickup at ${formatPickup(order.scheduledFor)}, which has already passed.`,
      `Call ${order.customerPhone} to agree a new pickup time, or cancel and refund the order.`,
    ],
    key: `late:${order.code}`,
    level: "warning",
  });
}

// Called by the webhook, by the order page check and by the expiry job. Safe to call more than once.
export async function markPaid({ where, paymentId, amountCents = null, currency = null, providerName = null, providerOrderId = null }) {
  const order = await prisma.order.findFirst({ where });
  if (!order) {
    await alertStaff({
      subject: "A payment arrived that matches no order",
      lines: [
        `Provider: ${providerName ?? "unknown"}. Payment ${paymentId ?? "unknown"}${amountCents != null ? ` for ${money(amountCents)}` : ""}.`,
        "Find it in the payment dashboard and refund it, or call the customer.",
      ],
      key: `orphan:${paymentId}`,
    });
    return null;
  }

  if (amountCents != null && (amountCents !== order.totalCents || (currency && currency.toUpperCase() !== "SGD"))) {
    await alertStaff({
      subject: `Payment amount for ${order.code} doesn't match the order`,
      lines: [
        `Order total ${money(order.totalCents)} SGD, payment ${money(amountCents)} ${String(currency ?? "").toUpperCase()} (${paymentId}).`,
        "The order was not marked as paid. Check the payment dashboard.",
      ],
      key: `mismatch:${paymentId}`,
    });
    return order;
  }

  const { count } = await prisma.order.updateMany({
    where: { id: order.id, status: "PENDING_PAYMENT" },
    data: {
      status: "PLACED",
      paidAt: new Date(),
      providerPaymentId: paymentId,
      ...(providerOrderId && providerOrderId !== order.providerOrderId ? { providerOrderId } : {}),
    },
  });

  if (count === 1) {
    await event(order.id, "PLACED");
    if (providerOrderId && order.providerOrderId && providerOrderId !== order.providerOrderId)
      providerFor(order.paymentProvider)?.cancel?.(order).catch((error) => reportError(error));
    notifyPlaced(order.id).catch((error) => console.error("Order notification failed:", error));
    await earnForOrder(order.id).catch((error) => console.error("Adding Rewards points failed:", error));
    await warnLatePayment(order);
    return { ...order, status: "PLACED" };
  }

  const current = await prisma.order.findUnique({ where: { id: order.id } });
  if (current.status === "CANCELLED" || current.status === "REFUNDED") {
    await alertStaff({
      subject: `REFUND NEEDED: payment arrived for cancelled order ${current.code}`,
      lines: [
        `${current.customerName} (${current.customerPhone}, ${current.customerEmail}) paid ${money(current.totalCents)} after order ${current.code} was cancelled.`,
        `Payment reference: ${paymentId}. Refund it from the ${current.paymentProvider ?? "payment"} dashboard, or call the customer and restore the order.`,
      ],
      key: `cancelled-paid:${paymentId}`,
    });
    return current;
  }
  if (paymentId && current.providerPaymentId && current.providerPaymentId !== paymentId) {
    await alertStaff({
      subject: `REFUND NEEDED: order ${current.code} was paid twice`,
      lines: [
        `${current.customerName} (${current.customerPhone}) paid ${money(current.totalCents)} twice for order ${current.code}.`,
        `Keep payment ${current.providerPaymentId} and refund payment ${paymentId} from the ${current.paymentProvider ?? "payment"} dashboard.`,
      ],
      key: `double:${paymentId}`,
    });
  }
  return current;
}

// A refund made in the Stripe dashboard (charge.refunded webhook).
export async function markRefunded({ paymentId, fullyRefunded, refundedCents }) {
  const order = await prisma.order.findFirst({ where: { providerPaymentId: paymentId } });
  if (!order) return null;
  const refunded = Math.min(refundedCents ?? 0, order.totalCents);
  if (refunded <= order.refundedCents && !(fullyRefunded && order.status !== "REFUNDED")) return order;
  await prisma.order.update({
    where: { id: order.id },
    data: { refundedCents: refunded, ...(fullyRefunded ? { status: "REFUNDED" } : {}) },
  });
  await event(order.id, fullyRefunded ? "REFUNDED" : order.status, `Refunded ${money(refunded)} in Stripe`);
  if (fullyRefunded) await reverseForOrder(order.id);
  if (fullyRefunded && OPEN_STATUSES.includes(order.status))
    await alertStaff({
      subject: `Order ${order.code} was refunded while still open`,
      lines: [`A full refund for ${order.code} came through from the payment dashboard. Don't prepare or hand it over.`],
      key: `refund-active:${order.code}`,
      level: "warning",
    });
  return order;
}

// Test mode only: the Pay button confirms straight away.
export async function confirmOrder(code, body) {
  const order = await prisma.order.findUnique({ where: { code } });
  if (!order) throw notFound("Order not found");
  if (order.status !== "PENDING_PAYMENT") return { status: order.status };
  const provider = providerFor(order.paymentProvider);
  if (!provider || (provider.name === "test" && env.PAYMENT_PROVIDER !== "test"))
    throw new HttpError(400, "This order cannot be confirmed.");
  const result = await provider.confirmPayment(order, body);
  if (!result.paid)
    throw new HttpError(402, "We could not verify your payment. If money was taken, contact us with your order number.");
  const saved = await markPaid({
    where: { id: order.id },
    paymentId: result.paymentId,
    amountCents: result.amountCents ?? null,
    currency: result.currency ?? null,
  });
  return { status: saved?.status ?? order.status };
}

// The order page asks this every few seconds after Stripe, so a slow webhook never leaves a paid order unconfirmed.
export async function checkOrder(code) {
  const order = await prisma.order.findUnique({ where: { code } });
  if (!order) throw notFound("Order not found");
  if (order.status !== "PENDING_PAYMENT" || !order.providerOrderId) return { status: order.status };
  const provider = providerFor(order.paymentProvider);
  if (!provider?.describe || provider.name === "test") return { status: order.status };
  const state = await provider.describe(order);
  if (state.state === "paid") {
    const saved = await markPaid({
      where: { id: order.id },
      paymentId: state.paymentId,
      amountCents: state.amountCents,
      currency: state.currency,
    });
    return { status: saved?.status ?? order.status };
  }
  return { status: order.status, processing: state.state === "pending" };
}

// Background job: release unpaid orders past their deadline (after checking with the provider).
export async function expireStaleOrders() {
  const now = new Date();
  const cutoff = new Date(now.getTime() - env.PENDING_ORDER_EXPIRY_MINUTES * 60_000);
  const stale = await prisma.order.findMany({
    where: { status: "PENDING_PAYMENT", OR: [{ createdAt: { lt: cutoff } }, { scheduledFor: { lte: now } }] },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  let cancelled = 0;
  for (const order of stale) {
    try {
      if ((await settleUnpaid(order)) === "cancelled") cancelled += 1;
    } catch (error) {
      console.error(`Could not settle unpaid order ${order.code}:`, error.message);
      reportError(error);
    }
  }
  return cancelled;
}

// ---------- reading ----------

// What the customer sees on the order page: no email or phone number.
export const shapeOrder = (order) => ({
  code: order.code,
  status: order.status,
  customerName: order.customerName.split(/\s+/)[0],
  pickupAt: order.scheduledFor,
  notes: order.notes,
  subtotalCents: order.subtotalCents,
  discountCents: order.discountCents,
  pointsRedeemed: order.pointsRedeemed,
  totalCents: order.totalCents,
  refundedCents: order.refundedCents,
  paid: Boolean(order.paidAt),
  paidAt: order.paidAt,
  createdAt: order.createdAt,
  paymentDeadline: order.status === "PENDING_PAYMENT" ? paymentDeadline(order) : null,
  events: order.events.map((e) => ({ status: e.status, at: e.createdAt })),
  items: order.items.map((item) => ({
    name: item.nameSnapshot,
    variant: item.variant,
    options: item.options,
    notes: item.notes,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    lineTotalCents: item.lineTotalCents,
  })),
});

export async function getOrder(code) {
  const order = await prisma.order.findUnique({ where: { code }, include: orderInclude });
  if (!order) throw notFound("Order not found");
  return shapeOrder(order);
}

// Lost the link? Order number + the email used at checkout gives it back.
export async function findOrderAccess({ code, email }) {
  const order = await prisma.order.findUnique({ where: { code }, select: { code: true, customerEmail: true } });
  if (!order || order.customerEmail.toLowerCase() !== email.toLowerCase())
    throw new HttpError(404, "We couldn't find an order with that number and email. Check both and try again.");
  return { code: order.code, token: orderToken(order.code) };
}
