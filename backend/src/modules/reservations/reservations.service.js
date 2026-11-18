import { randomInt } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { HttpError, notFound } from "../../utils/http-error.js";
import { bookingToken } from "../../utils/order-token.js";
import {
  addDays,
  formatSingapore,
  singaporeInstant,
  singaporeParts,
  toMinutes,
} from "../../utils/singapore-time.js";
import { getOperations } from "../settings/settings.service.js";
import { sendEmail } from "../email/email.service.js";
import {
  bookingCancelledEmail,
  bookingConfirmedEmail,
  bookingDeclinedEmail,
  bookingNotification,
  bookingReceivedEmail,
} from "../email/templates.js";
import { whatsappBooking } from "../whatsapp/notify.js";
import { whatsappEnabled } from "../whatsapp/whatsapp.service.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
// Bookings that hold a table: a request holds one straight away, so the restaurant can never be overbooked.
const HOLDING = ["REQUESTED", "CONFIRMED"];
const UPCOMING = ["REQUESTED", "CONFIRMED"];

function newCode() {
  const { date } = singaporeParts();
  const suffix = Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return `BT-${date.slice(2).replace(/-/g, "")}-${suffix}`;
}

export const bookingLink = (code) => `${env.SITE_URL}/reserve/${code}?t=${bookingToken(code)}`;

const timeLabel = (date) =>
  formatSingapore(date, { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();

const holdEnd = (startsAt) => new Date(startsAt.getTime() + env.BOOKING_MINUTES * 60_000);

// Tables in use during [from, to): every held booking that overlaps the window.
const tablesHeld = (client, from, to, exceptId) =>
  client.reservation.count({
    where: {
      status: { in: HOLDING },
      startsAt: { lt: to },
      endsAt: { gt: from },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
  });

function datesAhead(now = new Date()) {
  const today = singaporeParts(now).date;
  return Array.from({ length: env.RESERVATION_DAYS_AHEAD }, (_, i) => addDays(today, i));
}

// The days customers can choose from (closed days marked).
export async function bookingDays() {
  const { closedDates } = await getOperations();
  return datesAhead().map((date) => ({ date, closed: closedDates.includes(date) }));
}

// Arrival times for one day, each marked available or full.
export async function availability(date, now = new Date()) {
  const { closedDates } = await getOperations();
  if (!datesAhead(now).includes(date)) throw new HttpError(400, "Choose a date in the next few weeks.");
  if (closedDates.includes(date)) return { date, closed: true, times: [] };

  const earliest = now.getTime() + env.BOOKING_LEAD_MINUTES * 60_000;
  const starts = [];
  for (let m = toMinutes(env.BOOKING_FIRST); m <= toMinutes(env.BOOKING_LAST); m += env.BOOKING_STEP_MINUTES) {
    const at = singaporeInstant(date, m);
    if (at.getTime() >= earliest) starts.push(at);
  }
  if (!starts.length) return { date, closed: false, times: [] };

  const bookings = await prisma.reservation.findMany({
    where: { status: { in: HOLDING }, startsAt: { lt: holdEnd(starts.at(-1)) }, endsAt: { gt: starts[0] } },
    select: { startsAt: true, endsAt: true },
  });
  const times = starts.map((at) => {
    const end = holdEnd(at);
    const held = bookings.filter((b) => b.startsAt < end && b.endsAt > at).length;
    return { iso: at.toISOString(), label: timeLabel(at), available: held < env.TOTAL_TABLES };
  });
  return { date, closed: false, times };
}

async function isBookable(startsAt, now = new Date()) {
  const { date } = singaporeParts(startsAt);
  const day = await availability(date, now).catch(() => null);
  return day?.times.find((t) => t.iso === startsAt.toISOString()) ?? null;
}

const notify = (reservation, kind, extra) => {
  const link = bookingLink(reservation.code);
  const messages = {
    received: [
      { to: reservation.email, ...bookingReceivedEmail(reservation, link) },
      { to: env.RESTAURANT_EMAIL, ...bookingNotification(reservation) },
    ],
    confirmed: [{ to: reservation.email, ...bookingConfirmedEmail(reservation, link) }],
    declined: [{ to: reservation.email, ...bookingDeclinedEmail(reservation, extra) }],
    cancelled: [{ to: reservation.email, ...bookingCancelledEmail(reservation, extra) }],
  }[kind];
  whatsappBooking[kind]?.(reservation, link);
  Promise.allSettled(messages.map((m) => sendEmail(m))).then((results) =>
    results
      .filter((r) => r.status === "rejected")
      .forEach((r) => console.error("Booking email failed:", r.reason?.message ?? r.reason)),
  );
};

const respond = (reservation) => ({ code: reservation.code, token: bookingToken(reservation.code) });

export async function createReservation(input, user = null) {
  const existing = await prisma.reservation.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return respond(existing);

  if (input.partySize > env.MAX_PARTY_SIZE)
    throw new HttpError(400, `For groups bigger than ${env.MAX_PARTY_SIZE}, send us an event enquiry and we'll plan it with you.`, {
      code: "PARTY_TOO_BIG",
    });

  const startsAt = new Date(input.startsAt);
  const slot = await isBookable(startsAt);
  if (!slot) throw new HttpError(409, "That time can't be booked any more. Please choose another.", { code: "TIME_UNAVAILABLE" });
  if (!slot.available)
    throw new HttpError(409, "That time just got fully booked. Please choose another, or call us.", { code: "FULLY_BOOKED" });

  // Stops one person holding lots of tables: a few upcoming bookings, and one per day, per phone or email.
  const mine = await prisma.reservation.findMany({
    where: {
      status: { in: UPCOMING },
      startsAt: { gt: new Date() },
      OR: [{ email: input.email }, { phone: input.phone }],
    },
    select: { startsAt: true },
  });
  if (mine.length >= env.RESERVATION_MAX_ACTIVE)
    throw new HttpError(409, `You already have ${mine.length} upcoming bookings. Cancel one first, or call us.`, { code: "TOO_MANY" });
  const day = singaporeParts(startsAt).date;
  if (mine.some((b) => singaporeParts(b.startsAt).date === day))
    throw new HttpError(409, "You already have a booking on that day. Check your email for it, or call us to change it.", {
      code: "SAME_DAY",
    });

  let created;
  for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
    try {
      created = await prisma.$transaction(async (tx) => {
        // one booking at a time per day, so the last table can't be taken twice
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`booking:${day}`}))`;
        if ((await tablesHeld(tx, startsAt, holdEnd(startsAt))) >= env.TOTAL_TABLES)
          throw new HttpError(409, "That time just got fully booked. Please choose another, or call us.", { code: "FULLY_BOOKED" });
        return tx.reservation.create({
          data: {
            code: newCode(),
            idempotencyKey: input.idempotencyKey,
            name: input.name,
            email: input.email,
            phone: input.phone,
            whatsappOptIn: input.whatsapp && whatsappEnabled(),
            partySize: input.partySize,
            startsAt,
            endsAt: holdEnd(startsAt),
            occasion: input.occasion || null,
            notes: input.notes || null,
            termsAcceptedAt: new Date(),
            userId: user?.id ?? null,
          },
        });
      });
    } catch (error) {
      if (error.code !== "P2002") throw error;
      if (String(error.meta?.target ?? error.message).includes("idempotencyKey"))
        return respond(await prisma.reservation.findUnique({ where: { idempotencyKey: input.idempotencyKey } }));
    }
  }
  if (!created) throw new HttpError(503, "Could not save your booking. Please try again.");
  notify(created, "received");
  return respond(created);
}

// What the customer sees: no email or phone number.
export const shapeReservation = (r) => ({
  code: r.code,
  status: r.status,
  name: r.name.split(/\s+/)[0],
  partySize: r.partySize,
  startsAt: r.startsAt,
  occasion: r.occasion,
  notes: r.notes,
  createdAt: r.createdAt,
  confirmedAt: r.confirmedAt,
  canCancel: UPCOMING.includes(r.status) && r.startsAt.getTime() > Date.now(),
});

export async function getReservation(code) {
  const reservation = await prisma.reservation.findUnique({ where: { code } });
  if (!reservation) throw notFound("Booking not found");
  return shapeReservation(reservation);
}

export async function cancelByCustomer(code) {
  const reservation = await prisma.reservation.findUnique({ where: { code } });
  if (!reservation) throw notFound("Booking not found");
  if (!UPCOMING.includes(reservation.status) || reservation.startsAt.getTime() <= Date.now())
    throw new HttpError(409, "This booking can't be cancelled online any more. Please call us.");
  const { count } = await prisma.reservation.updateMany({
    where: { id: reservation.id, status: { in: UPCOMING } },
    data: { status: "CANCELLED", closedAt: new Date(), staffNote: "Cancelled by the guest" },
  });
  if (count) notify(reservation, "cancelled", { byGuest: true });
  return getReservation(code);
}

// ---------- staff ----------

const staffShape = (r) => ({
  code: r.code,
  status: r.status,
  name: r.name,
  email: r.email,
  phone: r.phone,
  partySize: r.partySize,
  startsAt: r.startsAt,
  occasion: r.occasion,
  notes: r.notes,
  tableLabel: r.tableLabel,
  staffNote: r.staffNote,
  createdAt: r.createdAt,
});

export async function listReservations({ date }) {
  const day = date ?? singaporeParts().date;
  const from = singaporeInstant(day, 0);
  const to = singaporeInstant(addDays(day, 1), 0);
  const rows = await prisma.reservation.findMany({
    where: { startsAt: { gte: from, lt: to } },
    orderBy: { startsAt: "asc" },
  });
  const held = rows.filter((r) => HOLDING.includes(r.status)).length;
  return { date: day, totalTables: env.TOTAL_TABLES, held, bookings: rows.map(staffShape) };
}

const STAFF_MOVES = {
  confirm: { from: ["REQUESTED"], to: "CONFIRMED" },
  decline: { from: ["REQUESTED"], to: "DECLINED" },
  cancel: { from: ["REQUESTED", "CONFIRMED"], to: "CANCELLED" },
  complete: { from: ["CONFIRMED"], to: "COMPLETED" },
  "no-show": { from: ["CONFIRMED"], to: "NO_SHOW" },
};

export async function staffUpdate(code, action, { table, reason } = {}) {
  const move = STAFF_MOVES[action];
  const reservation = await prisma.reservation.findUnique({ where: { code } });
  if (!reservation) throw notFound("Booking not found");
  if (!move.from.includes(reservation.status))
    throw new HttpError(409, `A booking that is ${reservation.status.toLowerCase()} can't be marked ${move.to.toLowerCase()}.`);
  const now = new Date();
  const { count } = await prisma.reservation.updateMany({
    where: { id: reservation.id, status: reservation.status },
    data: {
      status: move.to,
      ...(action === "confirm" ? { confirmedAt: now, tableLabel: table ?? null } : {}),
      ...(["decline", "cancel", "complete", "no-show"].includes(action) ? { closedAt: now } : {}),
      ...(reason ? { staffNote: reason } : {}),
    },
  });
  if (!count) throw new HttpError(409, "Someone else just updated this booking. Refresh and try again.");
  const updated = { ...reservation, status: move.to };
  if (action === "confirm") notify(updated, "confirmed");
  if (action === "decline") notify(updated, "declined", { reason });
  if (action === "cancel") notify(updated, "cancelled", { reason });
  return staffShape(await prisma.reservation.findUnique({ where: { id: reservation.id } }));
}

// Background job: requests nobody answered by their arrival time are closed, so they stop holding a table.
export async function expireStaleRequests() {
  const stale = await prisma.reservation.findMany({
    where: { status: "REQUESTED", startsAt: { lte: new Date() } },
    take: 100,
  });
  let closed = 0;
  for (const r of stale) {
    const { count } = await prisma.reservation.updateMany({
      where: { id: r.id, status: "REQUESTED" },
      data: { status: "DECLINED", closedAt: new Date(), staffNote: "Not answered before the arrival time" },
    });
    closed += count;
  }
  return closed;
}
