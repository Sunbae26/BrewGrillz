import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { reportMessage } from "../../lib/monitoring.js";
import { TEMPLATES } from "./templates.js";

const OUTBOX = new URL("../../../tmp/whatsapp/", import.meta.url);

export const whatsappEnabled = () => env.WHATSAPP_PROVIDER !== "off";

export function toWhatsAppNumber(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (/^[3689]\d{7}$/.test(digits)) return `65${digits}`;
  if (/^65[3689]\d{7}$/.test(digits)) return digits;
  return null;
}

export const maskNumber = (number) =>
  `${String(number).slice(0, 4)}****${String(number).slice(-2)}`;

const cleanParam = (value) =>
  String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/ {4,}/g, "   ")
    .trim()
    .slice(0, 900) || "-";

export function renderTemplate(name, params) {
  const template = TEMPLATES[name];
  if (!template) throw new Error(`Unknown WhatsApp template ${name}`);
  return template.body.replace(/\{\{(\d+)\}\}/g, (match, index) => cleanParam(params[Number(index) - 1]));
}

async function saveToFile(message) {
  await mkdir(OUTBOX, { recursive: true });
  const id = `file.${Date.now()}.${randomBytes(4).toString("hex")}`;
  await writeFile(
    new URL(`${id}.json`, OUTBOX),
    JSON.stringify({ id, at: new Date().toISOString(), ...message }, null, 2),
  );
  return id;
}

async function callMeta(payload) {
  const response = await fetch(
    `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  const body = await response.json().catch(() => ({}));
  if (response.ok) return body.messages?.[0]?.id ?? null;
  const error = body.error ?? {};
  throw new Error(`WhatsApp ${response.status}: ${error.message ?? "request failed"}`);
}

async function log(to, kind, outcome) {
  await prisma.whatsAppLog
    .create({
      data: {
        to: maskNumber(to),
        kind,
        ok: outcome.ok,
        waMessageId: outcome.id ?? null,
        error: outcome.error?.slice(0, 500) ?? null,
      },
    })
    .catch(() => {});
}

export async function sendTemplate(to, name, params) {
  if (!whatsappEnabled()) return null;
  const template = TEMPLATES[name];
  const payload = {
    to,
    type: "template",
    template: {
      name,
      language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE },
      components: template.params
        ? [{ type: "body", parameters: params.map((value) => ({ type: "text", text: cleanParam(value) })) }]
        : [],
    },
  };
  try {
    const id =
      env.WHATSAPP_PROVIDER === "meta"
        ? await callMeta(payload)
        : await saveToFile({ ...payload, preview: renderTemplate(name, params) });
    await log(to, name, { ok: true, id });
    return id;
  } catch (error) {
    await log(to, name, { ok: false, error: error.message });
    throw error;
  }
}

// Fire and forget: a WhatsApp problem never affects the order.
export function notifyCustomer({ phone, optIn, template, params }) {
  if (!optIn || !whatsappEnabled()) return;
  const to = toWhatsAppNumber(phone);
  if (!to) return;
  sendTemplate(to, template, params).catch((error) => {
    console.error(`WhatsApp ${template} to ${maskNumber(to)} failed: ${error.message}`);
    reportMessage("WhatsApp message failed", { extra: { template, error: error.message.slice(0, 300) } });
  });
}
