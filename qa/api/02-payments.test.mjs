// Stripe payments against a local fake Stripe (no keys or network needed).
// Starts its own API on port 4002 in Stripe mode, using the same database as the main API.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";

const BACKEND = new URL("../../backend/", import.meta.url).pathname;
const STRIPE_PORT = 4105;
// a fresh address per request, so the per-visitor rate limits don't trip during tests
const IP = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
const API = "http://localhost:4002/api";
const WEBHOOK_SECRET = "whsec_qa_payments";
const sessions = new Map();
let counter = 0;
let apiProcess;
let stripeServer;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readForm = (req) =>
  new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => resolve(Object.fromEntries(new URLSearchParams(raw))));
  });
const send = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

async function fakeStripe(req, res) {
  const url = new URL(req.url, "http://localhost");
  if (req.headers.authorization !== "Bearer sk_test_qa") return send(res, 401, { error: { message: "bad key" } });
  if (req.method === "POST" && url.pathname === "/checkout/sessions") {
    const form = await readForm(req);
    const id = `cs_test_${++counter}_${Date.now()}`;
    const session = {
      id,
      url: `https://checkout.stripe.test/${id}`,
      status: "open",
      payment_status: "unpaid",
      amount_total: Number(form["line_items[0][price_data][unit_amount]"]),
      currency: form["line_items[0][price_data][currency]"],
      client_reference_id: form.client_reference_id,
      metadata: { order: form["metadata[order]"] },
      success_url: form.success_url,
      cancel_url: form.cancel_url,
      methods: [form["payment_method_types[0]"], form["payment_method_types[1]"]],
      payment_intent: null,
    };
    sessions.set(id, session);
    return send(res, 200, session);
  }
  const expire = /^\/checkout\/sessions\/([^/]+)\/expire$/.exec(url.pathname);
  if (req.method === "POST" && expire) {
    const s = sessions.get(expire[1]);
    if (!s || s.status !== "open") return send(res, 400, { error: { message: "not open" } });
    s.status = "expired";
    return send(res, 200, s);
  }
  const read = /^\/checkout\/sessions\/([^/]+)$/.exec(url.pathname);
  if (req.method === "GET" && read) {
    const s = sessions.get(read[1]);
    return s ? send(res, 200, s) : send(res, 404, { error: { message: "no such session" } });
  }
  if (req.method === "POST" && url.pathname === "/refunds") {
    const form = await readForm(req);
    return send(res, 200, { id: `re_${Date.now()}`, status: "succeeded", amount: Number(form.amount) });
  }
  send(res, 404, { error: { message: "unknown fake Stripe path" } });
}

const pay = (id) => Object.assign(sessions.get(id), { status: "complete", payment_status: "paid", payment_intent: `pi_${id}` });

async function webhook(event, secret = WEBHOOK_SECRET) {
  const body = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  const res = await fetch(`${API}/webhooks/stripe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Stripe-Signature": `t=${t},v1=${v1}` },
    body,
  });
  return res.status;
}
const paidEvent = (session, overrides = {}) => ({ type: "checkout.session.completed", data: { object: { ...session, ...overrides } } });

const call = async (method, path, body) => {
  const res = await fetch(API + path, { method, headers: { "Content-Type": "application/json", "X-Forwarded-For": IP() }, body: body && JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

async function placeOrder() {
  const slots = (await call("GET", "/orders/pickup-slots")).body.data;
  const res = await call("POST", "/orders", {
    idempotencyKey: randomUUID(),
    items: [{ slug: "truffle-fries", quantity: 2 }],
    customer: { name: "Stripe Tester", email: "stripe@example.com", phone: "81234567" },
    pickupAt: slots.at(-1).slots[3].iso,
    agree: true,
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
}

const alertsSince = async (since, pattern) => {
  const dir = new URL("tmp/emails/", `file://${BACKEND}`);
  const files = (await readdir(dir).catch(() => [])).filter((f) => f >= since);
  return files.filter((f) => f.includes("BrewGrillz-alert") && pattern.test(f));
};
const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

before(async () => {
  stripeServer = createServer((req, res) => fakeStripe(req, res).catch((e) => send(res, 500, { error: { message: e.message } })));
  await new Promise((r) => stripeServer.listen(STRIPE_PORT, r));
  apiProcess = spawn(process.execPath, ["--env-file-if-exists=.env", "src/server.js"], {
    cwd: BACKEND,
    stdio: "ignore",
    env: {
      ...process.env,
      PORT: "4002",
      PAYMENT_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_test_qa",
      STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
      STRIPE_API_URL: `http://localhost:${STRIPE_PORT}`,
      EMAIL_PROVIDER: "file",
    },
  });
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(`${API}/ping`)).ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error("Stripe-mode API did not start");
});

after(async () => {
  apiProcess?.kill();
  await new Promise((r) => stripeServer.close(r));
});

test("creates a Stripe Checkout page in SGD for the server-priced total, card and PayNow", async () => {
  const { order, payment } = await placeOrder();
  assert.match(payment.url, /^https:\/\/checkout\.stripe\.test\//);
  const session = [...sessions.values()].find((s) => s.client_reference_id === order.code);
  assert.equal(session.amount_total, 1700);
  assert.equal(session.currency, "sgd");
  assert.deepEqual(session.methods, ["card", "paynow"]);
  assert.match(session.success_url, new RegExp(`/order/${order.code}\\?t=.+&paid=1$`));
});

test("a signed webhook marks the order paid; a forged one is rejected", async () => {
  const { order } = await placeOrder();
  const session = [...sessions.values()].find((s) => s.client_reference_id === order.code);
  pay(session.id);
  assert.equal(await webhook(paidEvent(session), "whsec_wrong"), 400);
  assert.equal((await call("GET", `/orders/${order.code}?t=${order.token}`)).body.data.status, "PENDING_PAYMENT");
  assert.equal(await webhook(paidEvent(session)), 200);
  assert.equal(await webhook(paidEvent(session)), 200, "repeat deliveries are harmless");
  const view = (await call("GET", `/orders/${order.code}?t=${order.token}`)).body.data;
  assert.equal(view.status, "PLACED");
  assert.equal(view.events.filter((e) => e.status === "PLACED").length, 1);
});

test("without a webhook, the order page check confirms the payment with Stripe", async () => {
  const { order } = await placeOrder();
  const session = [...sessions.values()].find((s) => s.client_reference_id === order.code);
  assert.equal((await call("POST", `/orders/${order.code}/check?t=${order.token}`)).body.data.status, "PENDING_PAYMENT");
  pay(session.id);
  assert.equal((await call("POST", `/orders/${order.code}/check?t=${order.token}`)).body.data.status, "PLACED");
});

test("the test-mode confirm shortcut is refused in Stripe mode", async () => {
  const { order } = await placeOrder();
  const res = await call("POST", `/orders/${order.code}/confirm?t=${order.token}`, {});
  assert.equal(res.status, 402);
});

test("a wrong amount is not marked paid and staff are alerted", async () => {
  const since = stamp();
  const { order } = await placeOrder();
  const session = [...sessions.values()].find((s) => s.client_reference_id === order.code);
  pay(session.id);
  await webhook(paidEvent(session, { amount_total: 100 }));
  assert.equal((await call("GET", `/orders/${order.code}?t=${order.token}`)).body.data.status, "PENDING_PAYMENT");
  await sleep(300);
  assert.equal((await alertsSince(since, /Payment-amount/)).length, 1);
});

test("a full refund in the Stripe dashboard marks the order refunded", async () => {
  const { order } = await placeOrder();
  const session = [...sessions.values()].find((s) => s.client_reference_id === order.code);
  pay(session.id);
  await webhook(paidEvent(session));
  await webhook({ type: "charge.refunded", data: { object: { payment_intent: session.payment_intent, amount: 1700, amount_refunded: 1700, refunded: true } } });
  assert.equal((await call("GET", `/orders/${order.code}?t=${order.token}`)).body.data.status, "REFUNDED");
});
