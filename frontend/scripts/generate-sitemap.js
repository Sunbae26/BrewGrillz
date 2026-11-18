// Writes build/client/sitemap.xml and robots.txt after the build.
import { writeFile } from "node:fs/promises";
import { loadEnv } from "vite";

const env = loadEnv("production", process.cwd(), "");
const SITE_URL = (process.env.VITE_SITE_URL ?? env.VITE_SITE_URL ?? "https://www.brewgrillz.sg").replace(/\/$/, "");
const build = new URL("../build/client/", import.meta.url);
const today = new Date().toISOString().slice(0, 10);

// Pages for Google. Checkout, order status and the style guide are left out on purpose.
const routes = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/menu", priority: "0.9", changefreq: "weekly" },
  { path: "/bar", priority: "0.7", changefreq: "monthly" },
  { path: "/reserve", priority: "0.7", changefreq: "monthly" },
  { path: "/our-place", priority: "0.6", changefreq: "monthly" },
  { path: "/events", priority: "0.6", changefreq: "monthly" },
  { path: "/rewards", priority: "0.5", changefreq: "monthly" },
  { path: "/privacy", priority: "0.2", changefreq: "yearly" },
  { path: "/terms", priority: "0.2", changefreq: "yearly" },
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((r) => `  <url><loc>${SITE_URL}${r.path === "/" ? "/" : r.path}</loc><lastmod>${today}</lastmod><changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`).join("\n")}
</urlset>
`;
const robots = `User-agent: *
Allow: /
Disallow: /checkout
Disallow: /order/
Disallow: /reserve/BT-
Disallow: /track
Disallow: /styleguide
Disallow: /account
Disallow: /admin
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password

Sitemap: ${SITE_URL}/sitemap.xml
`;
await writeFile(new URL("sitemap.xml", build), xml);
await writeFile(new URL("robots.txt", build), robots);
console.log(`Sitemap written with ${routes.length} pages for ${SITE_URL}.`);

// Hosting serves /404.html for unknown addresses (with a real 404 status).
import { copyFile } from "node:fs/promises";
await copyFile(new URL("404/index.html", build), new URL("404.html", build));
