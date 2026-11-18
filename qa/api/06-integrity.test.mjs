// Integrity under pressure: double clicks, parallel requests, overbooking and double-spending points.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { IP, call, newCustomer, teamSession } from "./_helpers.mjs";

const BACKEND = new URL("../../backend/", import.meta.url).pathname;
const slot = async (n = 2) => (await call("GET", "/orders/pickup-slots")).body.data[0].slots[n].iso;
const sgDate = (days) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date(Date.now() + days * 86_400_000));
const phone = () => `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

test("INT-01 the same order sent 10 times at once creates one order", async () => {
  const body = {
    idempotencyKey: randomUUID(),
    items: [{ slug: "truffle-fries", quantity: 1 }],
    customer: { name: "Double Click", email: "double@example.com", phone: "9123 4567" },
    pickupAt: await slot(),
    agree: true,
  };
  const results = await Promise.all(Array.from({ length: 10 }, () => call("POST", "/orders", body)));
  const ok = results.filter((r) => [200, 201].includes(r.status));
  assert.ok(ok.length >= 1, results.map((r) => r.status).join(","));
  assert.equal(new Set(ok.map((r) => r.body.data.order.code)).size, 1, "one order code");
  for (const r of results) assert.ok(r.status < 500, `no server errors: ${r.status}`);
});

test("INT-02 the same key with a different cart is refused (no paying for the old order)", async () => {
  const key = randomUUID();
  const base = { idempotencyKey: key, customer: { name: "Key Reuse", email: "key@example.com", phone: "9123 4567" }, pickupAt: await slot(), agree: true };
  const first = await call("POST", "/orders", { ...base, items: [{ slug: "truffle-fries", quantity: 1 }] });
  assert.equal(first.status, 201);
  const second = await call("POST", "/orders", { ...base, items: [{ slug: "truffle-fries", quantity: 3 }] });
  assert.equal(second.status, 409);
  assert.equal(second.body.details?.code ?? second.body.code, "ORDER_CHANGED");
});

test("INT-03 points can't be spent twice by two checkouts at the same moment", async () => {
  const member = await newCustomer();
  const admin = await teamSession("ADMIN");
  const found = await admin.call("GET", `/admin/members?q=${encodeURIComponent(member.email)}`);
  await admin.call("POST", `/admin/members/${found.body.data[0].id}/points`, { billCents: 10000 }); // 100 points
  const pickupAt = await slot(3);
  const attempt = () =>
    member.call("POST", "/orders", {
      idempotencyKey: randomUUID(),
      items: [{ slug: "chicken-wings", quantity: 2 }],
      customer: { name: "Points Racer", email: member.email, phone: "9123 4567" },
      pickupAt,
      agree: true,
      pointsToRedeem: 100,
    });
  const results = await Promise.all(Array.from({ length: 5 }, attempt));
  const placed = results.filter((r) => r.status === 201);
  assert.equal(placed.length, 1, results.map((r) => `${r.status}:${r.body.error ?? ""}`).join(" | "));
  const points = await member.call("GET", "/account/points");
  assert.equal(points.body.data.balance, 0);
});

test("INT-04 a cancelled order gives back the points spent and takes back the points earned", async () => {
  const member = await newCustomer();
  const admin = await teamSession("ADMIN");
  const found = await admin.call("GET", `/admin/members?q=${encodeURIComponent(member.email)}`);
  await admin.call("POST", `/admin/members/${found.body.data[0].id}/points`, { billCents: 10000 });
  const placed = await member.call("POST", "/orders", {
    idempotencyKey: randomUUID(),
    items: [{ slug: "chicken-wings", quantity: 2 }],
    customer: { name: "Points Back", email: member.email, phone: "9123 4567" },
    pickupAt: await slot(4),
    agree: true,
    pointsToRedeem: 100,
  });
  assert.equal(placed.status, 201);
  assert.equal((await member.call("GET", "/account/points")).body.data.balance, 0);
  const { code, token } = placed.body.data.order;
  await call("POST", `/orders/${code}/confirm?t=${token}`, {});
  assert.equal((await member.call("GET", "/account/points")).body.data.balance, 16, "earned on the S$16.80 paid");
  const cancelled = await admin.call("POST", `/admin/orders/${code}/cancel`, { reason: "QA" });
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
  assert.equal((await member.call("GET", "/account/points")).body.data.balance, 100);
});

test("INT-05 a sold-out dish can't be ordered, and comes back when switched on", async () => {
  const admin = await teamSession("ADMIN");
  await admin.call("PATCH", "/admin/menu/items/bruschetta", { isAvailable: false });
  try {
    const refused = await call("POST", "/orders", {
      idempotencyKey: randomUUID(),
      items: [{ slug: "bruschetta", quantity: 1 }],
      customer: { name: "Sold Out", email: "sold@example.com", phone: "9123 4567" },
      pickupAt: await slot(),
      agree: true,
    });
    assert.equal(refused.status, 400, JSON.stringify(refused.body));
    assert.equal(refused.body.details?.code ?? refused.body.code, "SOLD_OUT");
  } finally {
    await admin.call("PATCH", "/admin/menu/items/bruschetta", { isAvailable: true });
  }
});

test("INT-06 paused online orders are refused with the team's message", async () => {
  const admin = await teamSession("ADMIN");
  await admin.call("PATCH", "/admin/settings", { ordersPaused: true, pausedMessage: "Back at 7pm" });
  try {
    await new Promise((r) => setTimeout(r, 200));
    const refused = await call("POST", "/orders", {
      idempotencyKey: randomUUID(),
      items: [{ slug: "truffle-fries", quantity: 1 }],
      customer: { name: "Paused", email: "paused@example.com", phone: "9123 4567" },
      pickupAt: await slot(),
      agree: true,
    });
    assert.ok([409, 503].includes(refused.status), `${refused.status} ${JSON.stringify(refused.body)}`);
    assert.match(refused.body.error, /Back at 7pm|paused/i);
  } finally {
    await admin.call("PATCH", "/admin/settings", { ordersPaused: false });
  }
});

// Overbooking: a separate API with only 2 tables, and 12 guests booking the same time at once.
let api;
const SMALL = "http://localhost:4003/api";
before(async () => {
  api = spawn(process.execPath, ["--env-file-if-exists=.env", "src/server.js"], {
    cwd: BACKEND,
    stdio: "ignore",
    env: { ...process.env, PORT: "4003", TOTAL_TABLES: "2", EMAIL_PROVIDER: "file", WHATSAPP_PROVIDER: "off" },
  });
  for (let i = 0; i < 50; i += 1) {
    if (await fetch(`${SMALL}/ping`).then((r) => r.ok).catch(() => false)) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("small API didn't start");
});
after(() => api?.kill());

test("INT-07 no overbooking: 12 parallel bookings for one time never go over the 2 tables", async () => {
  const day = sgDate(50 + Math.floor(Math.random() * 9));
  const res = await fetch(`${SMALL}/reservations/availability?date=${day}`, { headers: { "X-Forwarded-For": IP() } }).then((r) => r.json());
  const free = res.data.times.filter((t) => t.available).at(-1);
  assert.ok(free, "a free time");
  const book = () =>
    fetch(`${SMALL}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": IP() },
      body: JSON.stringify({
        idempotencyKey: randomUUID(),
        startsAt: free.iso,
        partySize: 2,
        name: "Rush Guest",
        email: `rush${Math.floor(Math.random() * 1e9)}@example.com`,
        phone: phone(),
        agree: true,
      }),
    }).then((r) => r.status);
  const statuses = await Promise.all(Array.from({ length: 12 }, book));
  const accepted = statuses.filter((s) => s === 201).length;
  assert.ok(accepted >= 1 && accepted <= 2, statuses.join(","));
  assert.ok(statuses.every((s) => s === 201 || s === 409), statuses.join(","));
  const afterwards = await fetch(`${SMALL}/reservations/availability?date=${day}`, { headers: { "X-Forwarded-For": IP() } }).then((r) => r.json());
  assert.equal(afterwards.data.times.find((t) => t.iso === free.iso).available, false, "that time is now full");
});
