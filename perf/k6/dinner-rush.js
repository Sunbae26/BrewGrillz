// A busy Friday evening: people browsing the menu, pickup orders, table bookings, an office on one
// shared address, and the team watching the dashboard. Run against a local or staging API, never live.
//   k6 run k6/dinner-rush.js                      (5 minutes, about 190 visitors at once)
//   SCALE=2 HOLD=10m k6 run k6/dinner-rush.js     (twice as busy, for longer)
import http from "k6/http";
import { check, group, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";
import exec from "k6/execution";
import crypto from "k6/crypto";

const between = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const uuid = () => {
  const b = new Uint8Array(crypto.randomBytes(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

const API = (__ENV.API ?? "http://localhost:4000/api").replace(/\/$/, "");
const SCALE = Number(__ENV.SCALE ?? 1);
const HOLD = __ENV.HOLD ?? "3m";
const STAFF_EMAIL = __ENV.STAFF_EMAIL ?? "qa-admin@brewgrillz.test";
const STAFF_PASSWORD = __ENV.STAFF_PASSWORD ?? "qa-grill-password-2026";

const ordersPlaced = new Counter("orders_placed");
const bookingsMade = new Counter("bookings_made");
const bookingsFull = new Counter("bookings_fully_booked");
const checkoutTime = new Trend("checkout_duration", true);

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }, 409));

const ramp = (target) => [
  { duration: __ENV.RAMP ?? "45s", target: Math.round(target * SCALE) },
  { duration: HOLD, target: Math.round(target * SCALE) },
  { duration: "20s", target: 0 },
];

export const options = {
  scenarios: {
    browsing: { executor: "ramping-vus", exec: "browse", startVUs: 0, stages: ramp(150) },
    checkout: {
      executor: "ramping-arrival-rate",
      exec: "checkout",
      startRate: 0,
      timeUnit: "1m",
      preAllocatedVUs: Math.round(20 * SCALE),
      maxVUs: Math.round(60 * SCALE),
      stages: ramp(30),
    },
    bookings: { executor: "constant-arrival-rate", exec: "book", rate: Math.max(1, Math.round(6 * SCALE)), timeUnit: "1m", duration: "4m", preAllocatedVUs: 5, maxVUs: 20 },
    office: { executor: "constant-vus", exec: "officeBrowse", vus: Math.round(40 * SCALE), duration: "4m", startTime: "20s" },
    staff: { executor: "constant-vus", exec: "staff", vus: 3, duration: "4m" },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{kind:read}": ["p(95)<400", "p(99)<1000"],
    "http_req_duration{kind:write}": ["p(95)<1200"],
    "http_req_duration{kind:staff}": ["p(95)<600"],
    checks: ["rate>0.99"],
  },
};

const ip = () => `100.${between(64, 127)}.${between(0, 255)}.${between(1, 254)}`;
const get = (path, name, address = ip(), kind = "read", extra = {}) =>
  http.get(`${API}${path}`, { headers: { "X-Forwarded-For": address, ...extra }, tags: { kind, name } });
const post = (path, body, name, address = ip(), extra = {}) =>
  http.post(`${API}${path}`, JSON.stringify(body), { headers: { "Content-Type": "application/json", "X-Forwarded-For": address, ...extra }, tags: { kind: "write", name } });
const sgDate = (days) => new Date(Date.now() + 8 * 3_600_000 + days * 86_400_000).toISOString().slice(0, 10);

export function setup() {
  const menu = http.get(`${API}/menu`).json("data");
  const dishes = [];
  for (const category of menu.categories)
    if (category.orderable)
      for (const item of category.items ?? [])
        if (item.available && !item.options && !item.variants) dishes.push(item.id);
  const login = post("/auth/login", { email: STAFF_EMAIL, password: STAFF_PASSWORD }, "staff-login");
  return { dishes, staffCookie: login.cookies.brewgrillz_session?.[0]?.value };
}

export function browse(data) {
  const me = ip();
  group("browse", () => {
    check(get("/menu", "menu", me), { "menu 200": (r) => r.status === 200 });
    get("/info", "info", me);
    sleep(between(2, 6));
    get(`/menu/availability?items=${pick(data.dishes)},${pick(data.dishes)}`, "availability", me);
    sleep(between(2, 6));
    if (Math.random() < 0.4) {
      get("/reservations/days", "booking-days", me);
      get(`/reservations/availability?date=${sgDate(between(1, 20))}`, "booking-times", me);
    }
    sleep(between(3, 8));
  });
}

const OFFICE = "203.0.113.10";
export function officeBrowse(data) {
  check(get("/menu", "office-menu", OFFICE), { "office colleague not rate limited": (r) => r.status === 200 });
  get(`/menu/availability?items=${pick(data.dishes)}`, "office-availability", OFFICE);
  sleep(between(10, 20));
}

export function checkout(data) {
  const me = ip();
  const started = Date.now();
  group("checkout", () => {
    const slots = get("/orders/pickup-slots", "pickup-slots", me);
    if (!check(slots, { "slots 200": (r) => r.status === 200 })) return;
    const days = slots.json("data");
    if (!days?.length) return;
    const lines = [...new Set([pick(data.dishes), pick(data.dishes), pick(data.dishes)])].slice(0, between(1, 3)).map((slug) => ({ slug, quantity: between(1, 2) }));
    const created = post(
      "/orders",
      {
        idempotencyKey: uuid(),
        items: lines,
        customer: { name: "Dinner Rush", email: `rush.${exec.vu.idInTest}@example.com`, phone: "9123 4567" },
        pickupAt: pick(days[0].slots.slice(0, 8)).iso,
        agree: true,
      },
      "create-order",
      me,
    );
    if (!check(created, { "order created": (r) => r.status === 201 })) return;
    const { code, token } = created.json("data.order");
    check(post(`/orders/${code}/confirm?t=${token}`, {}, "confirm-order", me), { "payment confirmed": (r) => r.status === 200 });
    ordersPlaced.add(1);
    check(get(`/orders/${code}?t=${token}`, "order-status", me), { "status page 200": (r) => r.status === 200 });
  });
  checkoutTime.add(Date.now() - started);
}

export function book() {
  const me = ip();
  const date = sgDate(between(2, 55));
  const times = get(`/reservations/availability?date=${date}`, "booking-times", me);
  if (!check(times, { "availability 200": (r) => r.status === 200 })) return;
  const free = (times.json("data.times") ?? []).filter((t) => t.available);
  if (!free.length) return;
  const response = post(
    "/reservations",
    { idempotencyKey: uuid(), startsAt: pick(free).iso, partySize: between(2, 8), name: "Load Tester", email: `load.${uuid().slice(0, 8)}@example.com`, phone: `9${between(1000000, 9999999)}`, agree: true },
    "create-booking",
    me,
  );
  check(response, { "booking accepted or full": (r) => r.status === 201 || r.status === 409 });
  if (response.status === 201) bookingsMade.add(1);
  if (response.status === 409) bookingsFull.add(1);
}

export function staff(data) {
  if (!data.staffCookie) return sleep(10);
  const headers = { Cookie: `brewgrillz_session=${data.staffCookie}` };
  const me = `100.64.0.${exec.vu.idInTest}`;
  check(get("/admin/orders", "orders-board", me, "staff", headers), { "board 200": (r) => r.status === 200 });
  get("/admin/summary", "summary", me, "staff", headers);
  if (Math.random() < 0.3) get(`/admin/reservations?date=${sgDate(0)}`, "bookings-board", me, "staff", headers);
  sleep(10);
}
