import { test, expect, addDish } from "./helpers.js";

// Moving around the site on a phone the way people do: through the menu, the cart and the dish pop-up,
// then swiping. Each check is a real finger swipe, so a stuck scroll lock fails the test.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

async function swipeUp(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 200, y: 650 }] });
  for (let i = 1; i <= 12; i += 1) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 200, y: 650 - i * 40 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(900);
  await cdp.detach();
  return page.evaluate(() => Math.round(window.scrollY));
}

async function expectScrolls(page, where) {
  expect(await page.evaluate(() => document.body.style.overflow), `${where}: page left locked`).not.toBe("hidden");
  expect(await swipeUp(page), `${where}: swiping doesn't move the page`).toBeGreaterThan(100);
  const nav = await page.locator(".nav").boundingBox();
  expect(nav?.y ?? -1, `${where}: the navbar should stay on screen while scrolling`).toBeGreaterThanOrEqual(0);
  // back to the top, like a person reaching for the menu again (the navbar slides back in)
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
}

const MENU_LINKS = ["Home", "Menu", "Bar", "Our Place", "Events", "Rewards", "Book a table"];

test("E2E-MOB-01 every link in the phone menu opens a page you can scroll, and Back still scrolls", async ({ page }) => {
  await page.goto("/");
  await expectScrolls(page, "home at the start");
  for (const label of MENU_LINKS) {
    await page.locator(".burger").click();
    await expect(page.locator(".mnav")).toBeVisible();
    await page.locator(".mnav__link", { hasText: label }).first().click();
    await expect(page.locator(".mnav")).toHaveCount(0);
    await page.waitForTimeout(1200);
    await expectScrolls(page, `after menu → ${label}`);
  }
  await page.goBack();
  await page.waitForTimeout(1200);
  await expectScrolls(page, "after Back");
});

test("E2E-MOB-02 opening and closing the phone menu without choosing anything leaves the page scrollable", async ({ page }) => {
  await page.goto("/menu");
  await page.locator(".burger").click();
  await expect(page.locator(".mnav")).toBeVisible();
  await page.locator(".burger").click();
  await expect(page.locator(".mnav")).toHaveCount(0);
  await expectScrolls(page, "menu opened and closed");
});

test("E2E-MOB-03 the phone menu's Order online and account buttons leave the next page scrollable", async ({ page }) => {
  await page.goto("/");
  await page.locator(".burger").click();
  await page.locator(".mnav__foot a", { hasText: "Order online" }).click();
  await page.waitForTimeout(1200);
  await expectScrolls(page, "menu → Order online");
  await page.locator(".burger").click();
  await page.locator(".mnav__foot a", { hasText: /Sign in|My account/ }).click();
  await page.waitForTimeout(1200);
  await expectScrolls(page, "menu → Sign in");
});

test("E2E-MOB-04 dish pop-up and cart drawer unlock the page when closed or when going to checkout", async ({ page }) => {
  await page.goto("/menu");
  await addDish(page, "Truffle Fries");
  await expectScrolls(page, "after closing a dish");
  await page.locator(".cartbtn").click();
  await expect(page.locator(".cline")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expectScrolls(page, "after closing the cart");
  await page.locator(".cartbtn").click();
  await page.locator(".drawer a, .drawer button", { hasText: /checkout/i }).first().click();
  await page.waitForURL(/\/checkout/);
  await page.waitForTimeout(1200);
  await expectScrolls(page, "cart → checkout");
});

test("E2E-MOB-05 every page keeps its text inside the screen with side margins", async ({ page }) => {
  const problems = [];
  for (const path of ["/", "/menu", "/bar", "/our-place", "/events", "/reserve", "/rewards", "/track", "/login", "/register", "/checkout", "/privacy"]) {
    await page.goto(path);
    // scroll through once so every slide-in animation has finished before measuring
    for (let y = 0; y < 12000; y += 600) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(1200);
    await page.evaluate(() => window.scrollTo(0, 0));
    const tight = await page.evaluate(() => {
      const width = window.innerWidth;
      const out = [];
      for (const el of document.querySelectorAll("h1, h2, h3, p, label, .btn")) {
        // sideways carousels and decorative words scroll or bleed on purpose
        if (el.closest(".mnav, .marquee, .vibes__track, .platters__posters, .footer, .hero__cards, .me__words, .mchip, .ribbon, .drawer, .modal, .print-only")) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden") continue;
        if (r.left < 16 || r.right > width - 16) out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} (${Math.round(r.left)} / ${Math.round(width - r.right)}px)`);
      }
      return [...new Set(out)].slice(0, 5);
    });
    if (tight.length) problems.push(`${path}: ${tight.join(", ")}`);
  }
  expect(problems).toEqual([]);
});

test("E2E-MOB-06 phone navbar: account, cart and menu buttons are evenly spaced", async ({ page }) => {
  await page.goto("/");
  const [a, c, m] = await Promise.all([".acctbtn", ".cartbtn", ".burger"].map((s) => page.locator(s).boundingBox()));
  const gap1 = c.x - (a.x + a.width);
  const gap2 = m.x - (c.x + c.width);
  expect(Math.abs(gap1 - gap2), `gaps ${gap1}px and ${gap2}px`).toBeLessThanOrEqual(2);
});

test("E2E-MOB-07 phone hero: no photo cards, headline inside the margins, both buttons on the first screen", async ({ page }) => {
  for (const [width, height] of [[360, 740], [390, 844], [430, 932]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator(".hero__cards")).toBeHidden();
    const title = await page.locator(".hero__title").boundingBox();
    expect(title.x, `${width}px: headline left margin`).toBeGreaterThanOrEqual(16);
    expect(width - (title.x + title.width), `${width}px: headline right margin`).toBeGreaterThanOrEqual(16);
    for (const name of ["Order online", "Book a table"]) {
      const box = await page.locator(".hero__ctas .btn", { hasText: name }).boundingBox();
      expect(box.y + box.height, `${width}px: "${name}" is on the first screen`).toBeLessThanOrEqual(height);
    }
  }
});

test("E2E-MOB-08 desktop hero photo cards are decoration only: clicking them stays on the home page", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(() => sessionStorage.setItem("bgz-intro", "1"));
  await page.goto("/");
  await expect(page.locator(".hero__cards")).toBeVisible();
  await expect(page.locator(".hero__cards a")).toHaveCount(0);
  await page.waitForTimeout(1500);
  await page.locator(".hero__card--a").click({ force: true });
  await page.waitForTimeout(800);
  expect(new URL(page.url()).pathname).toBe("/");
  await context.close();
});
