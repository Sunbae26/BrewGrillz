// Finds the breaking point: requests per second climb in steps until errors or slow answers stop the test.
//   PEAK=800 k6 run k6/stress.js
// Local or staging only. On the live site this would look like an attack.
import http from "k6/http";
import { check } from "k6";
import crypto from "k6/crypto";

const API = (__ENV.API ?? "http://localhost:4000/api").replace(/\/$/, "");
const PEAK = Number(__ENV.PEAK ?? 800);
const STEP = __ENV.STEP ?? "30s";

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const octet = () => Math.floor(Math.random() * 254) + 1;
const ip = () => `100.${64 + Math.floor(Math.random() * 63)}.${octet()}.${octet()}`;
const uuid = () => {
  const b = new Uint8Array(crypto.randomBytes(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

export const options = {
  scenarios: {
    stress: {
      executor: "ramping-arrival-rate",
      startRate: 20,
      timeUnit: "1s",
      preAllocatedVUs: 200,
      maxVUs: 2000,
      stages: [0.1, 0.25, 0.5, 0.75, 1].map((share) => ({ duration: STEP, target: Math.round(PEAK * share) })),
    },
  },
  thresholds: {
    http_req_failed: [{ threshold: "rate<0.05", abortOnFail: true, delayAbortEval: "10s" }],
    http_req_duration: [{ threshold: "p(95)<2000", abortOnFail: true, delayAbortEval: "10s" }],
  },
};

export function setup() {
  const menu = http.get(`${API}/menu`).json("data");
  const dishes = menu.categories.filter((c) => c.orderable).flatMap((c) => (c.items ?? []).filter((i) => i.available && !i.options && !i.variants).map((i) => i.id));
  const slot = http.get(`${API}/orders/pickup-slots`).json("data")[0].slots[0].iso;
  return { dishes, slot };
}

export default function (data) {
  const headers = { "X-Forwarded-For": ip(), "Content-Type": "application/json" };
  const roll = Math.random();
  let response;
  if (roll < 0.5) response = http.get(`${API}/menu`, { headers, tags: { name: "menu" } });
  else if (roll < 0.7) response = http.get(`${API}/menu/availability?items=${pick(data.dishes)},${pick(data.dishes)}`, { headers, tags: { name: "availability" } });
  else if (roll < 0.82) response = http.get(`${API}/info`, { headers, tags: { name: "info" } });
  else if (roll < 0.95) response = http.get(`${API}/orders/pickup-slots`, { headers, tags: { name: "slots" } });
  else
    response = http.post(
      `${API}/orders`,
      JSON.stringify({ idempotencyKey: uuid(), items: [{ slug: pick(data.dishes), quantity: 1 }], customer: { name: "Stress Test", email: "stress@example.com", phone: "9123 4567" }, pickupAt: data.slot, agree: true }),
      { headers, tags: { name: "create-order" } },
    );
  check(response, { ok: (r) => r.status >= 200 && r.status < 400 });
}
