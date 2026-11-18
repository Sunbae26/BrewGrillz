import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { reportMessage } from "../../lib/monitoring.js";

const OUTBOX = new URL("../../../tmp/emails/", import.meta.url);
const RETRY_MINUTES = [1, 5, 15, 30, 60, 120];
const MAX_ATTEMPTS = RETRY_MINUTES.length + 1;
const CLAIM_MINUTES = 5;
const KEEP_FAILED_DAYS = 7;

export function maskEmail(address) {
  const [name = "", domain = ""] = String(address).split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

const maskAll = (list) => list.map(maskEmail).join(", ");

async function saveToFile({ to, subject, html }) {
  await mkdir(OUTBOX, { recursive: true });
  const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${subject.replace(/[^a-z0-9]+/gi, "-").slice(0, 60)}.html`;
  const file = new URL(name, OUTBOX);
  await writeFile(
    file,
    `<!-- To: ${to.join(", ")} | Subject: ${subject} -->\n${html}`,
  );
  return fileURLToPath(file);
}

function resendHint(status, body) {
  if (status === 401)
    return "Resend rejected the API key. Check RESEND_API_KEY in backend/.env and restart the backend.";
  if (status === 403 && /own email address|verify a domain/i.test(body)) {
    return "Resend's free tier only delivers to the email you signed up with until a domain is verified. Use that address as the customer email and RESTAURANT_EMAIL.";
  }
  if (status === 403)
    return "Resend refused the request. Check the API key's permissions and the EMAIL_FROM address.";
  if (status === 422)
    return "Resend rejected the message. Check that EMAIL_FROM uses your verified domain, like: BrewGrillz <info@brewgrillz.sg>.";
  if (status === 429)
    return "Resend's sending limit was reached. The email will be retried.";
  return "Resend could not send the email.";
}

async function sendWithResend({ to, subject, html }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      ...(env.EMAIL_REPLY_TO ? { reply_to: env.EMAIL_REPLY_TO } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (response.ok) return (await response.json()).id;
  const body = await response.text();
  throw new Error(
    `${resendHint(response.status, body)} (Resend ${response.status}: ${body.slice(0, 300)})`,
  );
}

const nextAttemptAt = (attempts) =>
  new Date(
    Date.now() +
      RETRY_MINUTES[Math.min(attempts - 1, RETRY_MINUTES.length - 1)] * 60_000,
  );

let outboxWaiting = true;

async function queueRetry(payload, error) {
  outboxWaiting = true;
  await prisma.emailOutbox.create({
    data: {
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      attempts: 1,
      lastError: error.message.slice(0, 500),
      nextAttemptAt: nextAttemptAt(1),
    },
  });
}

export async function sendEmail(message) {
  const payload = { ...message, to: [message.to].flat() };
  if (env.EMAIL_PROVIDER !== "resend") {
    const file = await saveToFile(payload);
    console.log(`Email saved (file mode): ${file}`);
    return { sent: false, file };
  }
  try {
    const id = await sendWithResend(payload);
    console.log(
      `Email sent to ${maskAll(payload.to)}: "${payload.subject}" (Resend id ${id})`,
    );
    return { sent: true, id };
  } catch (error) {
    console.error(
      `Email to ${maskAll(payload.to)} was not sent, queued for retry. ${error.message}`,
    );
    try {
      await queueRetry(payload, error);
    } catch (queueError) {
      console.error("Could not queue the email for retry:", queueError.message);
      throw error;
    }
    return { sent: false, queued: true };
  }
}

async function claim(row) {
  const { count } = await prisma.emailOutbox.updateMany({
    where: { id: row.id, nextAttemptAt: row.nextAttemptAt },
    data: { nextAttemptAt: new Date(Date.now() + CLAIM_MINUTES * 60_000) },
  });
  return count === 1;
}

export async function processEmailOutbox() {
  if (env.EMAIL_PROVIDER !== "resend" || !outboxWaiting) return 0;
  const due = await prisma.emailOutbox.findMany({
    where: { attempts: { lt: MAX_ATTEMPTS }, nextAttemptAt: { lte: new Date() } },
    orderBy: { nextAttemptAt: "asc" },
    take: 20,
  });
  let sent = 0;
  for (const row of due) {
    if (!(await claim(row))) continue;
    try {
      const id = await sendWithResend(row);
      await prisma.emailOutbox.delete({ where: { id: row.id } });
      console.log(
        `Retried email sent to ${maskAll(row.to)}: "${row.subject}" (Resend id ${id})`,
      );
      sent += 1;
    } catch (error) {
      const attempts = row.attempts + 1;
      await prisma.emailOutbox.update({
        where: { id: row.id },
        data: {
          attempts,
          lastError: error.message.slice(0, 500),
          nextAttemptAt: nextAttemptAt(attempts),
        },
      });
      if (attempts >= MAX_ATTEMPTS) {
        console.error(
          `Email to ${maskAll(row.to)} gave up after ${attempts} attempts: "${row.subject}"`,
        );
        reportMessage(`Email gave up after ${attempts} attempts`, {
          extra: { subject: row.subject, error: error.message.slice(0, 300) },
        });
      }
    }
  }
  await prisma.emailOutbox.deleteMany({
    where: {
      attempts: { gte: MAX_ATTEMPTS },
      createdAt: { lt: new Date(Date.now() - KEEP_FAILED_DAYS * 86_400_000) },
    },
  });
  outboxWaiting = false;
  const left = await prisma.emailOutbox.count({
    where: { attempts: { lt: MAX_ATTEMPTS } },
  });
  if (left) outboxWaiting = true;
  return sent;
}
