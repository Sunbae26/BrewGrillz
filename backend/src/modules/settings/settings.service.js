import { prisma } from "../../lib/prisma.js";
import { cached, invalidate } from "../../utils/cache.js";

const KEY = "operations";
const CACHE_SECONDS = 15;

const DEFAULTS = {
  ordersPaused: false,
  pausedMessage: "",
  slotCapacity: 0,
  closedDates: [],
};

function normalise(value) {
  const merged = { ...DEFAULTS, ...(value ?? {}) };
  return {
    ordersPaused: Boolean(merged.ordersPaused),
    pausedMessage: String(merged.pausedMessage ?? "").slice(0, 200),
    slotCapacity: Number.isInteger(merged.slotCapacity)
      ? Math.max(0, merged.slotCapacity)
      : 0,
    closedDates: [...new Set(Array.isArray(merged.closedDates) ? merged.closedDates : [])]
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .sort(),
  };
}

async function load() {
  const row = await prisma.appSetting.findUnique({ where: { key: KEY } });
  if (!row) return normalise();
  try {
    return normalise(JSON.parse(row.value));
  } catch {
    return normalise();
  }
}

export const getOperations = () =>
  cached("settings:operations", CACHE_SECONDS, load);

export async function updateOperations(changes) {
  const next = normalise({ ...(await load()), ...changes });
  await prisma.appSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  invalidate("settings:");
  return next;
}

export async function isClosedDate(isoDate) {
  const { closedDates } = await getOperations();
  return closedDates.includes(isoDate);
}
