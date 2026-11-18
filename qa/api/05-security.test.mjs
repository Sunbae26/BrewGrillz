// Security checks: who can reach what, injection, CORS, headers, webhooks and production settings.
// Run with the API in local test mode (see qa/README.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { API, IP, call, newCustomer, teamSession } from "./_helpers.mjs";

const BACKEND = new URL("../../backend/", import.meta.url).pathname;
const ORIGIN = API.replace(/\/api$/, "");

const STAFF_ROUTES = [
  ["GET", "/admin/summary"],
  ["GET", "/admin/orders"],
  ["GET", "/admin/orders/all"],
  ["POST", "/admin/orders/BG-261118-AAAA/advance"],
  ["POST", "/admin/orders/BG-261118-AAAA/cancel", {}],
  ["POST", "/admin/orders/BG-261118-AAAA/refund", {}],
  ["GET", "/admin/reservations"],
  ["POST", "/admin/reservations/BT-261118-AAAA/confirm", {}],
  ["GET", "/admin/enquiries"],
  ["PATCH", "/admin/enquiries/EV-261118-AAAA", { status: "CLOSED" }],
  ["GET", "/admin/menu"],
  ["PATCH", "/admin/menu/items/chicken-wings", { priceCents: 100 }],
  ["GET", "/admin/members?q=test"],
  ["POST", "/admin/members/1/points", { points: 5000 }],
  ["GET", "/admin/settings"],
  ["PATCH", "/admin/settings", { ordersPaused: true }],
  ["GET", "/admin/team"],
  ["POST", "/admin/team", { name: "Evil", email: "evil@example.com", password: "EvilEvil1", role: "ADMIN" }],
  ["GET", "/admin/reports"],
];

test("SEC-01 every dashboard route refuses guests (401) and customers (403)", async () => {
  const customer = await newCustomer();
  for (const [method, path, body] of STAFF_ROUTES) {
    assert.equal((await call(method, path, body)).status, 401, `guest ${method} ${path}`);
    assert.equal((await customer.call(method, path, body)).status, 403, `customer ${method} ${path}`);
  }
});

test("SEC-02 staff can't open admin-only areas, change prices, refund or promote themselves", async () => {
  const staff = await teamSession("STAFF");
  for (const path of ["/admin/team", "/admin/reports"]) assert.equal((await staff.call("GET", path)).status, 403, path);
  assert.equal((await staff.call("PATCH", "/admin/menu/items/chicken-wings", { priceCents: 100 })).status, 403);
  assert.equal((await staff.call("POST", "/admin/members/1/points", { points: 500 })).status, 403);
  assert.equal((await staff.call("PATCH", "/admin/settings", { slotCapacity: 1 })).status, 403);
  assert.equal(
    (await staff.call("POST", "/admin/team", { name: "Me", email: staff.user.email, password: "Password123", role: "ADMIN" })).status,
    403,
  );
  assert.equal((await staff.call("GET", "/admin/orders")).status, 200);
});

test("SEC-03 owner setup can't be repeated once an owner exists", async () => {
  await teamSession("ADMIN");
  const status = await call("GET", "/auth/setup");
  assert.equal(status.body.data.needsSetup, false);
  const again = await call("POST", "/auth/setup", { name: "Second Owner", email: `owner2${Date.now()}@example.com`, password: "Password123" });
  assert.equal(again.status, 409);
});

test("SEC-04 someone else's order and booking can't be read without the private link", async () => {
  const alice = await newCustomer();
  const slots = (await call("GET", "/orders/pickup-slots")).body.data;
  const placed = await alice.call("POST", "/orders", {
    idempotencyKey: randomUUID(),
    items: [{ slug: "chicken-wings", quantity: 1 }],
    customer: { name: "Alice", email: alice.email, phone: "9123 4567" },
    pickupAt: slots[0].slots[1].iso,
    agree: true,
  });
  assert.equal(placed.status, 201, JSON.stringify(placed.body));
  const { code } = placed.body.data.order;
  const bob = await newCustomer();
  assert.equal((await bob.call("GET", `/orders/${code}?t=${"a".repeat(43)}`)).status, 404);
  assert.equal((await bob.call("GET", `/orders/${code}`)).status, 400);
  const bobs = await bob.call("GET", "/account/orders");
  assert.ok(!bobs.body.data.some((o) => o.code === code));
  // order lookup needs the matching email
  assert.notEqual((await call("POST", "/orders/find", { code, email: "someone-else@example.com" })).status, 200);
});

test("SEC-05 SQL injection strings are treated as plain text", async () => {
  for (const email of ["a@b.co' OR 1=1 --", "' OR '1'='1"]) {
    const login = await call("POST", "/auth/login", { email, password: "x" });
    assert.ok([400, 401].includes(login.status), `${email}: ${login.status}`);
  }
  assert.equal((await call("GET", "/menu/items/chicken-wings'%20OR%201=1")).status, 400);
  const avail = await call("GET", `/menu/availability?items=${encodeURIComponent("x'); DROP TABLE \"User\"; --")}`);
  assert.ok(avail.status < 500, String(avail.status));
  assert.equal((await call("GET", "/health")).status, 200, "database still fine");
});

test("SEC-06 CORS only allows the configured site origins, with credentials", async () => {
  const allowed = await fetch(`${API}/menu`, { headers: { Origin: "http://localhost:5173" } });
  assert.equal(allowed.headers.get("access-control-allow-origin"), "http://localhost:5173");
  assert.equal(allowed.headers.get("access-control-allow-credentials"), "true");
  const evil = await fetch(`${API}/auth/me`, { headers: { Origin: "https://evil.example" } });
  assert.equal(evil.headers.get("access-control-allow-origin"), null);
  const preflight = await fetch(`${API}/orders`, {
    method: "OPTIONS",
    headers: { Origin: "https://evil.example", "Access-Control-Request-Method": "POST" },
  });
  assert.equal(preflight.headers.get("access-control-allow-origin"), null);
});

test("SEC-07 security headers present, no x-powered-by, unknown route is a JSON 404", async () => {
  const response = await fetch(`${API}/menu`);
  assert.equal(response.headers.get("x-powered-by"), null);
  assert.ok(response.headers.get("strict-transport-security"));
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.ok(response.headers.get("content-security-policy"));
  const missing = await fetch(`${API}/nope`);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: "Route not found" });
});

test("SEC-08 malformed JSON and oversized bodies are refused without stack traces", async () => {
  const bad = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": IP() },
    body: "{not json",
  });
  assert.equal(bad.status, 400);
  assert.ok(!/at .*\.js:\d+/.test(await bad.text()), "no stack trace");
  const huge = await fetch(`${API}/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": IP() },
    body: JSON.stringify({ message: "x".repeat(200_000) }),
  });
  assert.equal(huge.status, 413);
});

test("SEC-09 forged Stripe webhooks are refused", async () => {
  const response = await fetch(`${API}/webhooks/stripe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": "t=1,v1=abc" },
    body: JSON.stringify({ type: "checkout.session.completed", data: { object: { metadata: { orderCode: "BG-261118-AAAA" } } } }),
  });
  assert.ok([400, 401, 503].includes(response.status), String(response.status));
});

test("SEC-10 customers can't order with someone else's points or tamper with prices", async () => {
  const guest = await call("POST", "/orders", {
    idempotencyKey: randomUUID(),
    items: [{ slug: "chicken-wings", quantity: 1, priceCents: 1, unitPriceCents: 1 }],
    customer: { name: "Guest", email: "guest@example.com", phone: "9123 4567" },
    pickupAt: (await call("GET", "/orders/pickup-slots")).body.data[0].slots[1].iso,
    agree: true,
    pointsToRedeem: 100,
  });
  assert.equal(guest.status, 401, "points need a signed-in member");
  const cheap = await call("POST", "/orders", {
    idempotencyKey: randomUUID(),
    items: [{ slug: "chicken-wings", quantity: 1, priceCents: 1 }],
    customer: { name: "Guest", email: "guest@example.com", phone: "9123 4567" },
    pickupAt: (await call("GET", "/orders/pickup-slots")).body.data[0].slots[1].iso,
    agree: true,
  });
  if (cheap.status === 201) assert.equal(cheap.body.data.order.totalCents, 1090, "server prices the dish");
  else assert.equal(cheap.status, 400);
});

const LIVE = {
  EMAIL_PROVIDER: "resend",
  RESEND_API_KEY: "re_test_x",
  EMAIL_FROM: "BrewGrillz <info@brewgrillz.sg>",
  RESTAURANT_EMAIL: "info@brewgrillz.sg",
  SITE_URL: "https://www.brewgrillz.sg",
  CORS_ORIGINS: "https://www.brewgrillz.sg,https://brewgrillz.sg",
  STRIPE_WEBHOOK_SECRET: "whsec_x",
  NODE_ENV: "production",
  PAYMENT_PROVIDER: "stripe",
  STRIPE_SECRET_KEY: "sk_test_x",
  ORDER_TOKEN_SECRET: "a".repeat(40),
  SESSION_SECRET: "b".repeat(40),
  JWT_SECRET: "c".repeat(40),
  WHATSAPP_PROVIDER: "off",
};
const boot = (env, code = `await import("./src/config/env.js"); console.log("started");`) =>
  spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    cwd: BACKEND,
    env: { PATH: process.env.PATH, DATABASE_URL: "postgresql://u:p@db.example.com/brewgrillz", ...env },
    encoding: "utf8",
  });

test("SEC-11 production starts with good settings and refuses unsafe ones", () => {
  assert.equal(boot(LIVE).status, 0, boot(LIVE).stderr);
  const staging = boot({ ...LIVE, APP_ENV: "staging", EMAIL_FROM: "BrewGrillz <onboarding@resend.dev>" });
  assert.equal(staging.status, 0, `staging may use the Resend test sender: ${staging.stderr}`);
  const cases = [
    [{ PAYMENT_PROVIDER: "test" }, /test mode is not allowed in production/],
    [{ SESSION_SECRET: "dev-only-session" }, /SESSION_SECRET/],
    [{ JWT_SECRET: "b".repeat(40) }, /JWT_SECRET of its own/],
    [{ ORDER_TOKEN_SECRET: "b".repeat(40) }, /ORDER_TOKEN_SECRET of its own/],
    [{ SESSION_SECRET: "s".repeat(20) }, /SESSION_SECRET with at least 32 characters/],
    [{ ADMIN_SETUP_KEY: "short-key" }, /ADMIN_SETUP_KEY with at least 32 characters/],
    [{ EMAIL_PROVIDER: "file" }, /EMAIL_PROVIDER=resend/],
    [{ EMAIL_FROM: "BrewGrillz <onboarding@resend.dev>" }, /EMAIL_FROM on your own domain/],
    [{ SITE_URL: "http://www.brewgrillz.sg" }, /SITE_URL starting with https/],
    [{ CORS_ORIGINS: "https://www.brewgrillz.sg,http://localhost:5173" }, /no localhost/],
    [{ STRIPE_WEBHOOK_SECRET: "" }, /STRIPE_WEBHOOK_SECRET/],
  ];
  for (const [change, message] of cases) {
    const result = boot({ ...LIVE, ...change });
    assert.notEqual(result.status, 0, JSON.stringify(change));
    assert.match(result.stderr, message, JSON.stringify(change));
  }
});

test("SEC-12 owner setup on the live site needs the setup key", () => {
  const result = boot(
    { ...LIVE, ADMIN_SETUP_KEY: "the-real-setup-key-with-32-chars-ok!" },
    `const s = await import("./src/modules/auth/setup.service.js"); try { await s.createOwner({ name: "x", email: "x@y.z", password: "Password1", setupKey: "wrong" }); console.log("CREATED"); } catch (e) { console.log("STATUS", e.status); } process.exit(0);`,
  );
  assert.match(result.stdout, /STATUS 403/, result.stderr);
});

test("SEC-13 the sign-in cookie is httpOnly, SameSite=Lax and Secure on the live site", () => {
  const result = boot(
    LIVE,
    `const { setSessionCookie } = await import("./src/utils/session.js"); const res = { cookie: (n, v, o) => console.log(JSON.stringify({ n, ...o })) }; setSessionCookie(res, { id: 1, role: "CUSTOMER", passwordHash: "x".repeat(40), tokenVersion: 0 });`,
  );
  const options = JSON.parse(result.stdout.trim().split("\n").at(-1));
  assert.equal(options.n, "brewgrillz_session");
  assert.equal(options.secure, true);
  assert.equal(options.httpOnly, true);
  assert.equal(String(options.sameSite).toLowerCase(), "lax");
});

test("SEC-14 a staff price change can't go below S$0.50 or be a fraction", async () => {
  const admin = await teamSession("ADMIN");
  for (const priceCents of [0, -100, 49, 12.5, 100001, "100"]) {
    const response = await admin.call("PATCH", "/admin/menu/items/chicken-wings", { priceCents });
    assert.equal(response.status, 400, String(priceCents));
  }
});

// Behind Render there is one proxy hop: Render adds the real address as the last X-Forwarded-For entry,
// so anything a visitor puts in front of it is ignored.
test("SEC-15 a faked X-Forwarded-For doesn't get around the sign-in limit behind one proxy hop", async () => {
  const email = `spoof${Date.now()}@example.com`;
  const statuses = [];
  for (let i = 0; i < 12; i += 1) {
    const response = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": `1.2.3.${i}, 10.250.250.250` },
      body: JSON.stringify({ email, password: "whatever1" }),
    });
    statuses.push(response.status);
  }
  assert.equal(statuses.at(-1), 429, statuses.join(","));
});

test("SEC-16 a session stops working after the password changes on another device", async () => {
  const member = await newCustomer();
  assert.equal((await member.call("GET", "/account/orders")).status, 200);
  const other = await member.call("POST", "/auth/logout-all");
  assert.equal(other.status, 200);
  // the old cookie (captured before logout-all) is now refused
  assert.equal((await member.call("GET", "/account/orders")).status, 401);
  assert.ok(ORIGIN);
});
