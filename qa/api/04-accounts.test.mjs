// Sign-in, owner setup, accounts, Rewards points and the team. Run with the API in test mode.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { call, newCustomer, signIn, teamSession } from "./_helpers.mjs";

const slot = async () => (await call("GET", "/orders/pickup-slots")).body.data.at(-1).slots[3].iso;
const RIBEYE = { slug: "ribeye", quantity: 2, options: { Doneness: "Medium rare", Sauce: "Peppercorn sauce" } };

async function payOrder(session, items, extra = {}) {
  const placed = await session.call("POST", "/orders", {
    idempotencyKey: randomUUID(),
    items,
    customer: { name: "Rewards Member", email: session.user.email, phone: "91234567" },
    pickupAt: await slot(),
    agree: true,
    ...extra,
  });
  assert.equal(placed.status, 201, JSON.stringify(placed.body));
  const { code, token } = placed.body.data.order;
  await call("POST", `/orders/${code}/confirm?t=${token}`, {});
  return placed.body.data.order;
}

test("sign up, sign in, wrong password, sign out", async () => {
  const member = await newCustomer();
  assert.equal(member.user.role, "CUSTOMER");
  assert.equal(member.user.points.balance, 0);
  assert.equal((await member.call("GET", "/auth/me")).body.data.email, member.email);
  assert.equal((await call("POST", "/auth/register", { name: "Copy Cat", email: member.email, password: "another-password-1" })).status, 409);
  assert.equal((await call("POST", "/auth/login", { email: member.email, password: "nope-nope-nope" })).status, 401);
  assert.equal((await call("POST", "/auth/register", { name: "Weak Pass", email: `weak${Date.now()}@example.com`, password: "short" })).status, 400);
  const out = await member.call("POST", "/auth/logout");
  assert.match(out.headers.get("set-cookie"), /brewgrillz_session=;/);
});

test("the owner account can only be set up once", async () => {
  const status = await call("GET", "/auth/setup");
  if (status.body.data.needsSetup) await call("POST", "/auth/setup", { name: "Owner", email: `owner${Date.now()}@example.com`, password: "owner-password-2026" });
  const second = await call("POST", "/auth/setup", { name: "Intruder", email: `intruder${Date.now()}@example.com`, password: "intruder-password-1" });
  assert.equal(second.status, 409);
  assert.equal((await call("GET", "/auth/setup")).body.data.needsSetup, false);
});

test("members earn points on paid orders, spend them at checkout, and see it all in their account", async () => {
  const member = await newCustomer();
  const first = await payOrder(member, [RIBEYE]); // 2 × $34.90 = $69.80 → 69 points
  let points = (await member.call("GET", "/account/points")).body.data;
  assert.equal(points.balance, 69);

  // a dine-in bill from the dashboard: $64.50 → 64 points
  const kitchen = await teamSession("STAFF");
  const found = await kitchen.call("GET", `/admin/members?q=${encodeURIComponent(member.email)}`);
  const id = found.body.data[0].id;
  const added = await kitchen.call("POST", `/admin/members/${id}/points`, { billCents: 6450 });
  assert.equal(added.body.data.balance, 133);
  assert.equal((await kitchen.call("POST", `/admin/members/${id}/points`, { points: 500 })).status, 403, "only admins correct points");

  // spend 100 points = $5 off
  const second = await payOrder(member, [{ slug: "truffle-fries", quantity: 2 }], { pointsToRedeem: 100 });
  assert.equal(second.totalCents, 1700 - 500);
  points = (await member.call("GET", "/account/points")).body.data;
  assert.equal(points.balance, 133 - 100 + 12);
  assert.ok(points.entries.some((e) => e.type === "REDEEM" && e.points === -100));

  const odd = await member.call("POST", "/orders", { idempotencyKey: randomUUID(), items: [RIBEYE], customer: { name: "Rewards Member", email: member.email, phone: "91234567" }, pickupAt: await slot(), agree: true, pointsToRedeem: 50 });
  assert.equal(odd.status, 400, "points go in blocks of 100");
  const guest = await call("POST", "/orders", { idempotencyKey: randomUUID(), items: [RIBEYE], customer: { name: "Guest", email: "g@example.com", phone: "91234567" }, pickupAt: await slot(), agree: true, pointsToRedeem: 100 });
  assert.equal(guest.status, 401, "guests can't use points");

  const orders = (await member.call("GET", "/account/orders")).body.data;
  assert.deepEqual(orders.map((o) => o.code).sort(), [first.code, second.code].sort());
  assert.ok(orders[0].token);
});

test("a cancelled order takes back its points and returns spent ones", async () => {
  const member = await newCustomer();
  const kitchen = await teamSession("STAFF");
  const id = (await kitchen.call("GET", `/admin/members?q=${encodeURIComponent(member.email)}`)).body.data[0].id;
  await kitchen.call("POST", `/admin/members/${id}/points`, { billCents: 20000 }); // 200 points
  const order = await payOrder(member, [RIBEYE], { pointsToRedeem: 200 }); // $69.80 - $10 = $59.80 → earns 59
  assert.equal((await member.call("GET", "/account/points")).body.data.balance, 59);
  await kitchen.call("POST", `/admin/orders/${order.code}/cancel`, { reason: "Out of ribeye" });
  assert.equal((await member.call("GET", "/account/points")).body.data.balance, 200, "back to where it was");
});

test("bookings made while signed in show in the account", async () => {
  const member = await newCustomer();
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date(Date.now() + 9 * 86_400_000));
  const time = (await call("GET", `/reservations/availability?date=${day}`)).body.data.times.find((t) => t.available);
  const made = await member.call("POST", "/reservations", { idempotencyKey: randomUUID(), startsAt: time.iso, partySize: 2, name: "Rewards Member", email: member.email, phone: "9" + String(Date.now()).slice(-7), agree: true });
  assert.equal(made.status, 201, JSON.stringify(made.body));
  const mine = (await member.call("GET", "/account/bookings")).body.data;
  assert.equal(mine[0].code, made.body.data.code);
});

test("team: only admins manage it, the owner can't be demoted, staff see no reports", async () => {
  const admin = await teamSession("ADMIN");
  const kitchen = await teamSession("STAFF");
  assert.equal((await kitchen.call("GET", "/admin/team")).status, 403);
  assert.equal((await kitchen.call("GET", "/admin/reports")).status, 403);
  assert.equal((await kitchen.call("PATCH", "/admin/menu/items/truffle-fries", { priceCents: 100 })).status, 403, "staff can't change prices");
  assert.equal((await kitchen.call("PATCH", "/admin/menu/items/truffle-fries", { isAvailable: true })).status, 200, "staff can switch sold out");

  const email = `newstaff${Date.now()}@example.com`;
  const added = await admin.call("POST", "/admin/team", { name: "New Staff", email, password: "new-staff-pass-1", role: "STAFF" });
  assert.equal(added.status, 201, JSON.stringify(added.body));
  const fresh = await signIn(email, "new-staff-pass-1");
  assert.equal((await fresh.call("GET", "/admin/orders")).status, 200);
  await admin.call("PATCH", `/admin/team/${encodeURIComponent(email)}`, { role: "CUSTOMER" });
  assert.equal((await fresh.call("GET", "/admin/orders")).status, 401, "removed staff are signed out at once");

  const team = (await admin.call("GET", "/admin/team")).body.data;
  const owner = team.find((m) => m.isOwner);
  if (owner) assert.equal((await admin.call("PATCH", `/admin/team/${encodeURIComponent(owner.email)}`, { role: "STAFF" })).status, 403);
  const report = await admin.call("GET", "/admin/reports?days=7");
  assert.equal(report.body.data.daily.length, 7);
});

test("password reset: always says sent, link works once", async () => {
  const member = await newCustomer();
  const res = await call("POST", "/auth/forgot-password", { email: member.email });
  assert.equal(res.body.data.sent, true);
  assert.equal((await call("POST", "/auth/forgot-password", { email: "nobody@example.com" })).body.data.sent, true, "doesn't reveal who has an account");
  assert.equal((await call("POST", "/auth/reset-password", { token: "x".repeat(43), password: "brand-new-password" })).status, 400);
});
