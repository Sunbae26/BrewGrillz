import AxeBuilder from "@axe-core/playwright";
import { test, expect, signIn, teamAccount } from "./helpers.js";

// axe checks (WCAG 2.1 A and AA). Serious and critical problems fail the test.
const PAGES = ["/", "/menu", "/bar", "/our-place", "/events", "/reserve", "/rewards", "/track", "/checkout", "/login", "/register", "/forgot-password", "/privacy", "/terms", "/admin/login", "/404"];

async function scan(page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return result.violations
    .filter((v) => ["serious", "critical"].includes(v.impact))
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× e.g. ${v.nodes[0].target.join(" ")}`);
}

for (const width of [1440, 390]) {
  test(`E2E-A11Y public pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 500 ? 900 : 844 });
    const found = [];
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForTimeout(900);
      for (const line of await scan(page)) found.push(`${path}: ${line}`);
    }
    expect(found).toEqual([]);
  });
}

test("E2E-A11Y dashboard pages", async ({ page }) => {
  await signIn(page, teamAccount("ADMIN"), "/admin/login");
  const found = [];
  for (const path of ["/admin", "/admin/bookings", "/admin/enquiries", "/admin/menu", "/admin/rewards", "/admin/settings", "/admin/team", "/admin/reports"]) {
    await page.goto(path);
    await page.waitForTimeout(700);
    for (const line of await scan(page)) found.push(`${path}: ${line}`);
  }
  expect(found).toEqual([]);
});

test("E2E-A11Y the site can be used with the keyboard: skip to the menu and open a dish", async ({ page }) => {
  await page.goto("/menu");
  await page.keyboard.press("Tab");
  const first = await page.evaluate(() => document.activeElement?.textContent?.trim() || document.activeElement?.getAttribute("aria-label"));
  expect(first).toBeTruthy();
  const dish = page.locator("button.dish").first();
  await dish.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".modal")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".modal")).toHaveCount(0);
});
