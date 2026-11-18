import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { getOperations } from "../settings/settings.service.js";
import {
  addDays,
  formatSingapore,
  singaporeInstant,
  singaporeParts,
  toMinutes,
} from "../../utils/singapore-time.js";

// Orders that hold a pickup slot (unpaid ones too, until they expire).
const HOLDING = ["PENDING_PAYMENT", "PLACED", "PREPARING", "READY"];

export const countOrdersAt = (client, scheduledFor) =>
  client.order.count({ where: { scheduledFor, status: { in: HOLDING } } });

const label = (date) =>
  formatSingapore(date, { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();

const dayLabel = (isoDate, offset) =>
  offset === 0
    ? "Today"
    : offset === 1
      ? "Tomorrow"
      : formatSingapore(new Date(`${isoDate}T12:00:00+08:00`), {
          weekday: "short",
          day: "numeric",
          month: "short",
        });

// Every pickup time from now (plus prep time) for the next PICKUP_DAYS_AHEAD days.
export async function pickupDays(now = new Date()) {
  const { closedDates, slotCapacity } = await getOperations();
  const open = toMinutes(env.KITCHEN_OPEN);
  const close = toMinutes(env.KITCHEN_CLOSE);
  const step = env.PICKUP_SLOT_MINUTES;
  const earliest = now.getTime() + env.PICKUP_PREP_MINUTES * 60_000;
  const today = singaporeParts(now).date;

  const days = [];
  for (let offset = 0; offset < env.PICKUP_DAYS_AHEAD; offset += 1) {
    const date = addDays(today, offset);
    if (closedDates.includes(date)) continue;
    const slots = [];
    for (let minutes = open; minutes <= close; minutes += step) {
      const at = singaporeInstant(date, minutes);
      if (at.getTime() >= earliest) slots.push(at);
    }
    if (slots.length) days.push({ date, label: dayLabel(date, offset), slots });
  }

  let full = new Set();
  if (slotCapacity) {
    const all = days.flatMap((d) => d.slots);
    if (all.length) {
      const counts = await prisma.order.groupBy({
        by: ["scheduledFor"],
        where: { status: { in: HOLDING }, scheduledFor: { gte: all[0], lte: all.at(-1) } },
        _count: { _all: true },
      });
      full = new Set(
        counts.filter((c) => c._count._all >= slotCapacity).map((c) => c.scheduledFor.getTime()),
      );
    }
  }

  return days
    .map((d) => ({
      date: d.date,
      label: d.label,
      slots: d.slots
        .filter((at) => !full.has(at.getTime()))
        .map((at) => ({ iso: at.toISOString(), label: label(at) })),
    }))
    .filter((d) => d.slots.length);
}

export async function isValidPickup(pickupAt, now = new Date()) {
  const days = await pickupDays(now);
  const iso = pickupAt.toISOString();
  return days.some((d) => d.slots.some((s) => s.iso === iso));
}
