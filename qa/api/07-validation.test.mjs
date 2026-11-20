// Input checks: what customers can type, and that nothing they type turns into code in emails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { call } from "./_helpers.mjs";

const EMAILS = new URL("../../backend/tmp/emails/", import.meta.url);
const sgDate = (days) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date(Date.now() + days * 86_400_000));
const slot = async (n = 2) => (await call("GET", "/orders/pickup-slots")).body.data[0].slots[n].iso;
const orderWith = async (customer) =>
  call("POST", "/orders", {
    idempotencyKey: randomUUID(),
    items: [{ slug: "truffle-fries", quantity: 1 }],
    customer: { name: "Valid Name", email: "valid@example.com", phone: "9123 4567", ...customer },
    pickupAt: await slot(),
    agree: true,
  });

test("VAL-01 Singapore mobile numbers in common formats are accepted, others refused", async () => {
  for (const phone of ["91234567", "9123 4567", "+65 9123 4567", "+6591234567", "6591234567", "8123-4567"])
    assert.equal((await orderWith({ phone })).status, 201, phone);
  for (const phone of ["1234", "12345678", "+44 7700 900123", "9123456", "abcdefgh"])
    assert.equal((await orderWith({ phone })).status, 400, phone);
});

test("VAL-02 names: real names pass, HTML and numbers are refused", async () => {
  for (const name of ["Tan Wei Ming", "Siti Nur'Aisyah", "Jean-Luc O'Neil", "R. Kumar"])
    assert.equal((await orderWith({ name })).status, 201, name);
  for (const name of ["<script>alert(1)</script>", "x", "Robert'); DROP TABLE", "a".repeat(90), "12345"])
    assert.equal((await orderWith({ name })).status, 400, name);
});

test("VAL-03 emails must look real", async () => {
  for (const email of ["nope", "a@b", "@example.com", "space in@example.com"])
    assert.equal((await orderWith({ email })).status, 400, email);
});

test("VAL-04 order quantities, notes and pickup times are checked", async () => {
  const base = { idempotencyKey: randomUUID(), customer: { name: "Valid Name", email: "v@example.com", phone: "91234567" }, agree: true };
  assert.equal((await call("POST", "/orders", { ...base, items: [{ slug: "truffle-fries", quantity: 0 }], pickupAt: await slot() })).status, 400);
  assert.equal((await call("POST", "/orders", { ...base, idempotencyKey: randomUUID(), items: [{ slug: "truffle-fries", quantity: 1.5 }], pickupAt: await slot() })).status, 400);
  assert.equal((await call("POST", "/orders", { ...base, idempotencyKey: randomUUID(), items: [], pickupAt: await slot() })).status, 400);
  assert.equal(
    (await call("POST", "/orders", { ...base, idempotencyKey: randomUUID(), items: [{ slug: "truffle-fries", quantity: 1 }], pickupAt: "2020-01-01T04:00:00.000Z" })).status,
    409,
    "a pickup time in the past",
  );
  assert.equal(
    (await call("POST", "/orders", { ...base, idempotencyKey: randomUUID(), items: [{ slug: "truffle-fries", quantity: 1 }], pickupAt: await slot(), notes: "n".repeat(400) })).status,
    400,
  );
});

test("VAL-05 table bookings: party size, how far ahead and terms are checked", async () => {
  const times = (await call("GET", `/reservations/availability?date=${sgDate(25)}`)).body.data.times;
  const base = { idempotencyKey: randomUUID(), startsAt: times.find((t) => t.available).iso, name: "Valid Name", email: "v@example.com", phone: "91234567", agree: true };
  assert.equal((await call("POST", "/reservations", { ...base, partySize: 0 })).status, 400);
  assert.equal((await call("POST", "/reservations", { ...base, idempotencyKey: randomUUID(), partySize: 46 })).status, 400);
  assert.equal((await call("POST", "/reservations", { ...base, idempotencyKey: randomUUID(), partySize: 2, agree: false })).status, 400);
  const far = await call("GET", `/reservations/availability?date=${sgDate(120)}`);
  assert.ok(far.status === 400 || (far.body.data?.times ?? []).length === 0, "no bookings 4 months ahead");
});

test("VAL-06 event enquiries: guest numbers and dates are checked", async () => {
  const base = { occasion: "Birthday", eventDate: sgDate(30), startTime: "19:00", guests: 30, name: "Valid Name", email: "v@example.com", phone: "91234567", agree: true };
  assert.equal((await call("POST", "/enquiries", { ...base, guests: 2 })).status, 400, "small groups book a table instead");
  assert.equal((await call("POST", "/enquiries", { ...base, eventDate: "2020-01-01" })).status, 400, "date in the past");
  assert.equal((await call("POST", "/enquiries", { ...base, occasion: "Rave" })).status, 400);
});

test("VAL-07 HTML typed into an enquiry shows as text in the staff email, never as code", async () => {
  const since = new Date().toISOString().replace(/:/g, "-").slice(0, 19);
  const made = await call("POST", "/enquiries", {
    occasion: "Birthday",
    eventDate: sgDate(35),
    startTime: "19:00",
    guests: 25,
    name: "Valid Name",
    email: `xss${Date.now()}@example.com`,
    phone: "91234567",
    message: `<img src=x onerror=alert(1)><a href="javascript:alert(2)">click</a>`,
    budget: "<b>S$50</b>",
    agree: true,
  });
  assert.equal(made.status, 201, JSON.stringify(made.body));
  await new Promise((r) => setTimeout(r, 400));
  const files = (await readdir(EMAILS)).filter((f) => f >= since && f.includes(made.body.data.code));
  assert.ok(files.length, "the staff email was written");
  for (const file of files) {
    const html = await readFile(new URL(file, EMAILS), "utf8");
    assert.ok(!html.includes("<img src=x"), `${file}: raw <img> in the email`);
    assert.ok(!/href="javascript:/i.test(html), `${file}: javascript link in the email`);
    assert.ok(!html.includes("<b>S$50</b>"), `${file}: raw <b> in the email`);
  }
});

test("VAL-08 newsletter: a bad email is refused, the same email twice is fine", async () => {
  assert.equal((await call("POST", "/newsletter", { email: "not-an-email" })).status, 400);
  const email = `news${Date.now()}@example.com`;
  assert.ok([200, 201].includes((await call("POST", "/newsletter", { email })).status));
  assert.ok([200, 201].includes((await call("POST", "/newsletter", { email })).status));
});
