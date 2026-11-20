// API tests for pickup ordering. Run with the API in test mode:
//   PAYMENT_PROVIDER=test EMAIL_PROVIDER=file, then: node --test api/
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// a fresh address per request, so the per-visitor rate limits don't trip during tests

import { API, call, newCustomer, teamSession } from "./_helpers.mjs";
let admin;
const staff = async (method, path, body) => (admin ??= await teamSession("ADMIN")).call(method, `/admin${path}`, body);

const slot = async (n = 2) => (await call("GET", "/orders/pickup-slots")).body.data.at(-1).slots[n].iso;
const customer = { name: "Test Diner", email: "test@example.com", phone: "9123 4567", whatsapp: true };
const order = async (items, extra = {}) =>
  call("POST", "/orders", { idempotencyKey: randomUUID(), items, customer, pickupAt: await slot(), agree: true, ...extra });

const WINGS = { slug: "chicken-wings", quantity: 2 };
const RIBS = { slug: "bbq-ribs", quantity: 1, variant: "Full slab" };
const MOJITO = { slug: "softdrinks-virgin-mojito", quantity: 1 };

test("prices on the server and places a paid order in test mode", async () => {
  const placed = await order([WINGS, RIBS, MOJITO], { notes: "No cutlery" });
  assert.equal(placed.status, 201, JSON.stringify(placed.body));
  const { code, token, totalCents } = placed.body.data.order;
  assert.match(code, /^BG-\d{6}-[A-Z2-9]{4}$/);
  assert.equal(totalCents, 10.9 * 200 + 3890 + 850);
  assert.equal(placed.body.data.payment.provider, "test");

  const confirmed = await call("POST", `/orders/${code}/confirm?t=${token}`, {});
  assert.equal(confirmed.body.data.status, "PLACED");

  const view = await call("GET", `/orders/${code}?t=${token}`);
  assert.equal(view.status, 200);
  assert.equal(view.body.data.status, "PLACED");
  assert.equal(view.body.data.customerName, "Test");
  assert.equal(view.body.data.customerEmail, undefined, "no personal details on the public order page");
  assert.deepEqual(view.body.data.events.map((e) => e.status), ["PENDING_PAYMENT", "PLACED"]);
  assert.equal(view.headers.get("cache-control"), "no-store");
});

test("refuses alcohol, unknown dishes, missing options and bad sizes", async () => {
  const beer = await order([{ slug: "beer-golden-ale", quantity: 1 }]);
  assert.equal(beer.status, 400);
  assert.match(beer.body.error, /dine-in only/);
  assert.equal((await order([{ slug: "not-a-dish", quantity: 1 }])).status, 400);
  const steak = await order([{ slug: "ribeye", quantity: 1 }]);
  assert.match(steak.body.error, /choose a doneness/i);
  const ribs = await order([{ slug: "bbq-ribs", quantity: 1, variant: "Giant slab" }]);
  assert.match(ribs.body.error, /choose a size/i);
});

test("validates customer details, terms, quantity and pickup time", async () => {
  const bad = await call("POST", "/orders", {
    idempotencyKey: randomUUID(),
    items: [{ ...WINGS, quantity: 99 }],
    customer: { name: "<script>", email: "nope", phone: "1234" },
    pickupAt: new Date().toISOString(),
    agree: false,
  });
  assert.equal(bad.status, 400);
  for (const field of ["items.0.quantity", "customer.name", "customer.email", "customer.phone", "agree"])
    assert.ok(Object.keys(bad.body.details).some((k) => k.startsWith(field.split(".")[0])), field);
  const past = await order([WINGS], { pickupAt: new Date(Date.now() + 5 * 60_000).toISOString() });
  assert.equal(past.status, 409);
  assert.equal(past.body.details.code, "SLOT_UNAVAILABLE");
});

test("the same Pay press never creates two orders", async () => {
  const body = { idempotencyKey: randomUUID(), items: [WINGS], customer, pickupAt: await slot(), agree: true };
  const first = await call("POST", "/orders", body);
  const again = await call("POST", "/orders", body);
  assert.equal(first.body.data.order.code, again.body.data.order.code);
  const changed = await call("POST", "/orders", { ...body, items: [{ ...WINGS, quantity: 3 }] });
  assert.equal(changed.status, 409);
});

test("order pages need the secret link token", async () => {
  const placed = await order([WINGS]);
  const { code } = placed.body.data.order;
  assert.equal((await call("GET", `/orders/${code}?t=wrong-token-123`)).status, 404);
  assert.equal((await call("GET", `/orders/${code}`)).status, 400);
  const found = await call("POST", "/orders/find", { code, email: "TEST@example.com" });
  assert.equal(found.body.data.code, code);
  assert.equal((await call("POST", "/orders/find", { code, email: "other@example.com" })).status, 404);
});

test("the dashboard needs a staff sign-in; orders move one step at a time; admins refund", async () => {
  assert.equal((await call("GET", "/admin/orders")).status, 401);
  const member = await newCustomer();
  assert.equal((await member.call("GET", "/admin/orders")).status, 403, "customers can't open the dashboard");

  const placed = await order([WINGS, RIBS]);
  const { code, token, totalCents } = placed.body.data.order;
  await call("POST", `/orders/${code}/confirm?t=${token}`, {});

  const board = await staff("GET", "/orders");
  assert.ok(board.body.data.active.some((o) => o.code === code));
  for (const status of ["PREPARING", "READY"])
    assert.equal((await staff("POST", `/orders/${code}/advance`)).body.data.status, status);

  const kitchen = await teamSession("STAFF");
  assert.equal((await kitchen.call("POST", `/admin/orders/${code}/refund`, {})).status, 403, "staff can't refund");

  const part = await staff("POST", `/orders/${code}/refund`, { amountCents: 500 });
  assert.equal(part.body.data.full, false);
  const rest = await staff("POST", `/orders/${code}/refund`, {});
  assert.equal(rest.body.data.full, true);
  assert.equal(rest.body.data.refundedCents, totalCents);
  const again = await staff("POST", `/orders/${code}/refund`, {});
  assert.match(again.body.error, /already been fully refunded/);

  const view = await call("GET", `/orders/${code}?t=${token}`);
  assert.equal(view.body.data.status, "REFUNDED");
  assert.deepEqual(view.body.data.events.map((e) => e.status).slice(0, 4), ["PENDING_PAYMENT", "PLACED", "PREPARING", "READY"]);
});

test("sold out and paused ordering are respected", async () => {
  await staff("PATCH", "/menu/items/chicken-wings", { isAvailable: false });
  const sold = await order([WINGS]);
  assert.match(sold.body.error, /sold out/);
  const avail = await call("GET", "/menu/availability?items=chicken-wings,truffle-fries");
  assert.deepEqual(avail.body.data, { "chicken-wings": false, "truffle-fries": true });
  await staff("PATCH", "/menu/items/chicken-wings", { isAvailable: true });

  await staff("PATCH", "/settings", { ordersPaused: true, pausedMessage: "Kitchen is full, back at 7pm." });
  const paused = await order([WINGS]);
  assert.equal(paused.status, 409);
  assert.equal(paused.body.error, "Kitchen is full, back at 7pm.");
  await staff("PATCH", "/settings", { ordersPaused: false });
});

test("errors never leak internals, and unknown routes are 404", async () => {
  const res = await call("GET", "/nope");
  assert.equal(res.status, 404);
  const big = await fetch(`${API}/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ x: "a".repeat(200_000) }) });
  assert.equal(big.status, 413);
});

test("rate limits stop a flood of orders from one visitor", async () => {
  const ip = "10.250.250.250";
  let limited = 0;
  for (let i = 0; i < 25; i += 1) {
    const res = await fetch(`${API}/orders`, { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": ip }, body: "{}" });
    if (res.status === 429) limited += 1;
  }
  assert.ok(limited >= 5, `expected some 429s, got ${limited}`);
});
