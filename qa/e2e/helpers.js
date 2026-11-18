import { test as base, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

export const API = process.env.QA_API ?? "http://localhost:4000/api";
const BACKEND = new URL("../../backend/", import.meta.url).pathname;
const IGNORED = [/Download the React DevTools/, /401 \(Unauthorized\)/, /ERR_TUNNEL_CONNECTION_FAILED/, /ERR_NAME_NOT_RESOLVED/, /google|gstatic|youtube/i];

const octet = () => Math.floor(Math.random() * 254) + 1;
export const freshIp = () => `172.${16 + Math.floor(Math.random() * 16)}.${octet()}.${octet()}`;
export const randomPhone = () => `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

// Every test collects console errors, crashes and 5xx responses, and fails on them.
export const test = base.extend({
  consoleLog: [
    async ({ page }, use, testInfo) => {
      const log = [];
      page.on("console", (m) => {
        if (m.type() === "error" && !IGNORED.some((re) => re.test(m.text()))) log.push(`[console] ${m.text()}`);
      });
      page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
      page.on("response", (r) => {
        if (r.status() >= 500) log.push(`[http ${r.status()}] ${r.url()}`);
      });
      // skip the intro animation, and give each test its own visitor address so rate limits don't trip
      await page.addInitScript(() => sessionStorage.setItem("bgz-intro", "1"));
      const ip = freshIp();
      await page.route(/localhost:4000\/api\//, (route) => route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": ip } }));
      await use(log);
      if (log.length) await testInfo.attach("console", { body: log.join("\n"), contentType: "text/plain" });
      expect(log, "no console errors, crashes or server errors").toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

// Dashboard accounts are made with the backend's own script (the same one the owner can use).
const made = new Set();
export function teamAccount(role = "ADMIN") {
  const email = `qa-${role.toLowerCase()}@brewgrillz.test`;
  const password = "qa-grill-password-2026";
  if (!made.has(email)) {
    execFileSync(process.execPath, ["--env-file-if-exists=.env", "scripts/create-admin.js", email, `QA ${role}`, password, role], { cwd: BACKEND, stdio: "ignore" });
    made.add(email);
  }
  return { email, password };
}

export async function apiCustomer(request) {
  const email = `e2e.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
  const password = "steak-and-chips-2026";
  const res = await request.post(`${API}/auth/register`, { data: { name: "Priya Raman", email, phone: randomPhone(), password }, headers: { "X-Forwarded-For": freshIp() } });
  expect(res.status(), await res.text()).toBe(201);
  return { email, password };
}

export async function signIn(page, { email, password }, path = "/login") {
  await page.goto(path);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator(".auth__submit").click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"));
}

// Adds a dish from the menu, picking any required options.
export async function addDish(page, name) {
  const dish = page.locator("button.dish", { hasText: name }).first();
  await dish.scrollIntoViewIfNeeded();
  await dish.click();
  const add = page.locator(".modal__buy button", { hasText: "Add" });
  await add.click();
  for (let i = 0; i < 3 && (await page.locator(".modal__err").count()); i += 1) {
    await page.locator(".modal__group:has(.modal__err) button").first().click();
    await add.click();
  }
  await page.keyboard.press("Escape");
  await expect(page.locator(".modal")).toHaveCount(0);
}

export const shot = (page, name) => page.screenshot({ path: `results/shots/${name}.png` });
