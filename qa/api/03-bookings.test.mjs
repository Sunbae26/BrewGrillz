// Table bookings and event enquiries. Run with the API in test mode.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";


import { API, call, teamSession } from "./_helpers.mjs";
let admin;
const staff = async (method, path, body) => (admin ??= await teamSession("ADMIN")).call(method, `/admin${path}`, body);

// a date far enough ahead that earlier test runs don't fill it, and a unique phone per guest
const sgDate = (days) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date(Date.now() + days * 86_400_000));
const phone = () => `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
const guest = (extra = {}) => ({
  idempotencyKey: randomUUID(),
  partySize: 4,
  name: "Booking Tester",
  email: `guest${Math.floor(Math.random() * 1e9)}@example.com`,
  phone: phone(),
  whatsapp: true,
  occasion: "Birthday",
  agree: true,
  ...extra,
});

async function freeTime(day) {
  const { body } = await call("GET", `/reservations/availability?date=${day}`);
  return body.data.times.filter((t) => t.available);
}

test("books a table, shows it with the secret link, and staff confirm it", async () => {
  const day = sgDate(20 + Math.floor(Math.random() * 30));
  const [slot] = await freeTime(day);
  const made = await call("POST", "/reservations", guest({ startsAt: slot.iso }));
  assert.equal(made.status, 201, JSON.stringify(made.body));
  const { code, token } = made.body.data;
  assert.match(code, /^BT-\d{6}-[A-Z2-9]{4}$/);

  const view = await call("GET", `/reservations/${code}?t=${token}`);
  assert.equal(view.body.data.status, "REQUESTED");
  assert.equal(view.body.data.email, undefined, "no personal details on the public page");
  assert.equal((await call("GET", `/reservations/${code}?t=wrong-token-1234`)).status, 404);

  const confirmed = await staff("POST", `/reservations/${code}/confirm`, { table: "T7" });
  assert.equal(confirmed.body.data.status, "CONFIRMED");
  assert.equal((await staff("POST", `/reservations/${code}/decline`, {})).status, 409, "can't decline after confirming");
  assert.equal((await call("GET", `/reservations/${code}?t=${token}`)).body.data.status, "CONFIRMED");
});

test("the same request twice makes one booking; guests can cancel their own", async () => {
  const day = sgDate(25);
  const [slot] = await freeTime(day);
  const body = guest({ startsAt: slot.iso });
  const a = await call("POST", "/reservations", body);
  const b = await call("POST", "/reservations", body);
  assert.equal(a.body.data.code, b.body.data.code);
  const cancelled = await call("POST", `/reservations/${a.body.data.code}/cancel?t=${a.body.data.token}`, {});
  assert.equal(cancelled.body.data.status, "CANCELLED");
});

test("never overbooks: a time is full once every table is held", async () => {
  const day = sgDate(55 + Math.floor(Math.random() * 4));
  const times = await freeTime(day);
  const last = times.at(-1);
  // TOTAL_TABLES defaults to 20
  const made = [];
  for (let i = 0; i < 20; i += 1) made.push(await call("POST", "/reservations", guest({ startsAt: last.iso })));
  assert.ok(made.every((m) => m.status === 201), JSON.stringify(made.find((m) => m.status !== 201)?.body));
  const full = await call("POST", "/reservations", guest({ startsAt: last.iso }));
  assert.equal(full.status, 409);
  assert.equal(full.body.details.code, "FULLY_BOOKED");
  const after = (await call("GET", `/reservations/availability?date=${day}`)).body.data.times.find((t) => t.iso === last.iso);
  assert.equal(after.available, false);
  // a decline frees the table again
  await staff("POST", `/reservations/${made[0].body.data.code}/decline`, { reason: "Kitchen closed" });
  assert.equal((await call("POST", "/reservations", guest({ startsAt: last.iso }))).status, 201);
});

test("limits: party size, times outside hours, one booking per day per guest", async () => {
  const day = sgDate(30);
  const [slot, next] = await freeTime(day);
  const big = await call("POST", "/reservations", guest({ startsAt: slot.iso, partySize: 46 }));
  assert.equal(big.body.details.code, "PARTY_TOO_BIG");
  const odd = await call("POST", "/reservations", guest({ startsAt: `${day}T20:10:00.000Z` }));
  assert.equal(odd.status, 409);
  const me = guest({ startsAt: slot.iso });
  assert.equal((await call("POST", "/reservations", me)).status, 201);
  const again = await call("POST", "/reservations", { ...me, idempotencyKey: randomUUID(), startsAt: next.iso });
  assert.equal(again.body.details.code, "SAME_DAY");
  const bad = await call("POST", "/reservations", { ...guest({ startsAt: slot.iso }), name: "1", phone: "123", agree: false });
  assert.equal(bad.status, 400);
});

test("event enquiries need notice, enough guests and valid details", async () => {
  const ok = await call("POST", "/enquiries", {
    occasion: "Birthday",
    eventDate: sgDate(14),
    startTime: "19:00",
    guests: 30,
    wholeVenue: false,
    budget: "S$50 a head",
    name: "Party Planner",
    email: `planner${Math.floor(Math.random() * 1e9)}@example.com`,
    phone: phone(),
    message: "Surprise party!",
    agree: true,
  });
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  assert.match(ok.body.data.code, /^EV-\d{6}-[A-Z2-9]{4}$/);
  const soon = await call("POST", "/enquiries", { occasion: "Birthday", eventDate: sgDate(0), startTime: "21:30", guests: 30, name: "Party Planner", email: "late@example.com", phone: phone(), agree: true });
  assert.equal(soon.body.details?.code, "TOO_SOON");
  const small = await call("POST", "/enquiries", { occasion: "Birthday", eventDate: sgDate(14), startTime: "19:00", guests: 3, name: "Party Planner", email: "small@example.com", phone: phone(), agree: true });
  assert.equal(small.status, 400);
  const list = await staff("GET", "/enquiries");
  assert.ok(list.body.data.some((e) => e.code === ok.body.data.code));
});
