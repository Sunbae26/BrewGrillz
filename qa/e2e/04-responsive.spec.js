import { test, expect } from "./helpers.js";

// No sideways scrolling, nothing cut off, at the sizes people actually use.
const SIZES = [
  [360, 740, "small phone"],
  [390, 844, "iPhone"],
  [430, 932, "large phone"],
  [768, 1024, "tablet"],
  [1024, 768, "small laptop"],
  [1280, 800, "laptop"],
  [1440, 900, "desktop"],
  [1920, 1080, "big screen"],
];
const PAGES = ["/", "/menu", "/bar", "/our-place", "/events", "/reserve", "/rewards", "/track", "/login", "/register", "/checkout", "/privacy", "/admin/login"];

for (const [width, height, label] of SIZES) {
  test(`E2E-RESP ${label} ${width}px: no page scrolls sideways`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const problems = [];
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) problems.push(`${path} is ${overflow}px too wide`);
      const navOk = await page.locator(".nav__logo").isVisible();
      if (!navOk) problems.push(`${path}: logo hidden`);
    }
    expect(problems).toEqual([]);
  });
}
