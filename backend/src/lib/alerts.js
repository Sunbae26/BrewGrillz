import { env } from "../config/env.js";
import { reportMessage } from "./monitoring.js";
import { sendEmail } from "../modules/email/email.service.js";
import { staffAlertEmail } from "../modules/email/templates.js";

const recent = new Map();
const DEDUPE_MS = 6 * 60 * 60_000;

function seenRecently(key) {
  if (!key) return false;
  const now = Date.now();
  for (const [entry, at] of recent)
    if (now - at > DEDUPE_MS) recent.delete(entry);
  if (recent.has(key)) return true;
  recent.set(key, now);
  return false;
}

export async function alertStaff({ subject, lines = [], key, level = "error" }) {
  if (seenRecently(key)) return;
  console.error(`ALERT: ${subject}${lines.length ? ` | ${lines.join(" | ")}` : ""}`);
  reportMessage(subject, { level, extra: { lines } });
  try {
    await sendEmail({
      to: env.RESTAURANT_EMAIL,
      ...staffAlertEmail(subject, lines),
    });
  } catch (error) {
    console.error("Staff alert email failed:", error.message);
  }
}
