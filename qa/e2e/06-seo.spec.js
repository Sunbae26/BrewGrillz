import { test, expect } from "./helpers.js";

// Every public page has a unique title and description, a canonical link and a sharing image;
// private pages are kept out of Google.
const PUBLIC = ["/", "/menu", "/bar", "/our-place", "/events", "/reserve", "/rewards", "/privacy", "/terms"];
const PRIVATE = ["/checkout", "/track", "/login", "/register", "/account", "/admin/login"];

test("E2E-SEO public pages: title, description, canonical, Open Graph, X card", async ({ page }) => {
  const titles = new Set();
  const descriptions = new Set();
  for (const path of PUBLIC) {
    await page.goto(path);
    const title = await page.title();
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(title.length, `${path} title length`).toBeGreaterThan(20);
    expect(title.length, `${path} title length`).toBeLessThan(90);
    expect(description.length, `${path} description`).toBeGreaterThan(60);
    expect(description.length, `${path} description`).toBeLessThan(220);
    titles.add(title);
    descriptions.add(description);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toMatch(new RegExp(`^https://[^/]+${path === "/" ? "/$" : `${path}$`}`));
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /og-image\.jpg$/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    expect(await page.locator("h1").count(), `${path} has one main heading`).toBe(1);
  }
  expect(titles.size).toBe(PUBLIC.length);
  expect(descriptions.size).toBe(PUBLIC.length);
});

test("E2E-SEO private pages are noindex", async ({ page }) => {
  for (const path of PRIVATE) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute("content", /noindex/);
  }
});

test("E2E-SEO home page has the restaurant details for Google", async ({ page }) => {
  await page.goto("/");
  const json = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent());
  expect(json["@type"]).toBe("Restaurant");
  expect(json.address.streetAddress).toBe("163 Rochor Road");
  expect(json.telephone).toMatch(/\+65/);
  expect(json.hasMenu).toMatch(/\/menu$/);
});

test("E2E-SEO sitemap, robots.txt and sharing image are served", async ({ request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  for (const path of ["/menu", "/reserve", "/rewards"]) expect(xml).toContain(path);
  expect(xml).not.toContain("/admin");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Sitemap: https:\/\/.+\/sitemap\.xml/);
  expect(robots).toMatch(/Disallow: \/admin/);
  const image = await request.get("/og-image.jpg");
  expect(image.status()).toBe(200);
});
