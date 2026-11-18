import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../../config/env.js";
import { HttpError } from "../../../utils/http-error.js";
import { orderToken } from "../../../utils/order-token.js";

export const STRIPE_API_VERSION = "2024-06-20";
const SIGNATURE_TOLERANCE_SECONDS = 300;
const MIN_SESSION_SECONDS = 31 * 60;
const MAX_SESSION_SECONDS = 23 * 60 * 60;
const PAID_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
];

async function stripe(path, { method = "GET", form } = {}) {
  const response = await fetch(`${env.STRIPE_API_URL.replace(/\/$/, "")}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Stripe-Version": STRIPE_API_VERSION,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Stripe error:", data?.error?.message ?? response.status);
    const error = new HttpError(
      502,
      "The payment service is unavailable. Please try again in a moment.",
    );
    error.providerStatus = response.status;
    throw error;
  }
  return data;
}

export function sessionExpiresAt(deadline, now = Date.now()) {
  const seconds = Math.floor((deadline.getTime() - now) / 1000);
  return (
    Math.floor(now / 1000) +
    Math.min(MAX_SESSION_SECONDS, Math.max(MIN_SESSION_SECONDS, seconds))
  );
}

function describeSession(session) {
  const base = {
    paymentId: session.payment_intent ?? null,
    amountCents: session.amount_total ?? null,
    currency: session.currency ?? null,
  };
  if (session.status === "complete" && session.payment_status === "paid")
    return { ...base, state: "paid" };
  if (session.status === "complete") return { ...base, state: "pending" };
  if (session.status === "open")
    return {
      ...base,
      state: "open",
      client: { provider: "stripe", url: session.url },
    };
  return { ...base, state: "expired" };
}

function verifySignature(rawBody, header) {
  const pairs = String(header ?? "")
    .split(",")
    .map((part) => {
      const index = part.indexOf("=");
      return index === -1
        ? [part.trim(), ""]
        : [part.slice(0, index).trim(), part.slice(index + 1).trim()];
    });
  const timestamp = pairs.find(([key]) => key === "t")?.[1];
  const signatures = pairs
    .filter(([key, value]) => key === "v1" && value)
    .map(([, value]) => value);
  if (!timestamp || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS)
    return false;
  const expected = Buffer.from(
    createHmac("sha256", env.STRIPE_WEBHOOK_SECRET)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex"),
  );
  return signatures.some((signature) => {
    const received = Buffer.from(signature);
    return (
      received.length === expected.length && timingSafeEqual(received, expected)
    );
  });
}

export const stripeProvider = {
  name: "stripe",

  async createPayment(order, { deadline }) {
    const token = orderToken(order.code);
    const session = await stripe("/checkout/sessions", {
      method: "POST",
      form: {
        mode: "payment",
        "payment_method_types[0]": "card",
        "payment_method_types[1]": "paynow",
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "sgd",
        "line_items[0][price_data][unit_amount]": String(order.totalCents),
        "line_items[0][price_data][product_data][name]": `BrewGrillz pickup order ${order.code}`,
        customer_email: order.customerEmail,
        client_reference_id: order.code,
        "metadata[order]": order.code,
        "payment_intent_data[metadata][order]": order.code,
        expires_at: String(sessionExpiresAt(deadline)),
        success_url: `${env.SITE_URL}/order/${order.code}?t=${token}&paid=1`,
        cancel_url: `${env.SITE_URL}/checkout?cancelled=${order.code}&t=${token}`,
      },
    });
    return {
      providerOrderId: session.id,
      client: { provider: "stripe", url: session.url },
    };
  },

  async refund(paymentId, amountCents, reference) {
    const refund = await stripe("/refunds", {
      method: "POST",
      form: {
        payment_intent: paymentId,
        amount: String(amountCents),
        "metadata[reference]": reference,
      },
    });
    return { refundId: refund.id, status: refund.status };
  },

  async describe(order) {
    if (!order.providerOrderId) return { state: "expired" };
    return describeSession(
      await stripe(`/checkout/sessions/${order.providerOrderId}`),
    );
  },

  async cancel(order) {
    const current = await this.describe(order);
    if (current.state !== "open") return current;
    try {
      return describeSession(
        await stripe(`/checkout/sessions/${order.providerOrderId}/expire`, {
          method: "POST",
          form: {},
        }),
      );
    } catch (error) {
      if (error.providerStatus && error.providerStatus < 500)
        return this.describe(order);
      throw error;
    }
  },

  async confirmPayment(order) {
    const state = await this.describe(order);
    return state.state === "paid"
      ? { paid: true, ...state }
      : { paid: false, ...state };
  },

  parseWebhook(rawBody, headers) {
    if (!env.STRIPE_WEBHOOK_SECRET)
      throw new HttpError(503, "Stripe webhook secret is not configured");
    if (!verifySignature(rawBody, headers["stripe-signature"]))
      throw new HttpError(400, "Invalid webhook signature");
    const event = JSON.parse(rawBody);
    const object = event.data?.object;
    if (PAID_EVENTS.includes(event.type)) {
      if (object?.payment_status !== "paid") return null;
      return {
        type: "paid",
        providerOrderId: object.id,
        orderCode: object.client_reference_id ?? object.metadata?.order ?? null,
        paymentId: object.payment_intent,
        amountCents: object.amount_total ?? null,
        currency: object.currency ?? null,
      };
    }
    if (event.type === "charge.refunded" && object?.payment_intent) {
      return {
        type: "refunded",
        paymentId: object.payment_intent,
        amountCents: object.amount,
        refundedCents: object.amount_refunded,
        fullyRefunded: Boolean(object.refunded),
      };
    }
    return null;
  },
};
