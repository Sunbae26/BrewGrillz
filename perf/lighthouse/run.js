import { mkdirSync, writeFileSync } from "node:fs";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const SITE = (process.env.SITE ?? "http://localhost:4173").replace(/\/$/, "");
const LABEL = process.env.LABEL ?? "run";
const PAGES = (
  process.env.PAGES ??
  "/,/menu,/bar,/our-place,/events,/reserve,/rewards,/checkout,/track,/login,/privacy"
).split(",");
const FORMS = (process.env.FORMS ?? "mobile,desktop").split(",");
const BLOCKED = (process.env.BLOCK ?? "").split(",").filter(Boolean);

const outDir = new URL(`./results/${LABEL}/`, import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const desktop = {
  formFactor: "desktop",
  screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
  throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
};

const chrome = await chromeLauncher.launch({
  chromePath: process.env.CHROME_PATH,
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
});

const rows = [];
try {
  for (const form of FORMS) {
    for (const path of PAGES) {
      const result = await lighthouse(
        `${SITE}${path}`,
        {
          port: chrome.port,
          output: "html",
          logLevel: "error",
          onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
          blockedUrlPatterns: BLOCKED,
          ...(form === "desktop" ? desktop : {}),
        },
      );
      const { categories, audits } = result.lhr;
      const score = (key) => Math.round((categories[key].score ?? 0) * 100);
      const row = {
        form,
        path,
        performance: score("performance"),
        accessibility: score("accessibility"),
        bestPractices: score("best-practices"),
        seo: score("seo"),
        lcp: audits["largest-contentful-paint"].displayValue,
        cls: audits["cumulative-layout-shift"].displayValue,
        tbt: audits["total-blocking-time"].displayValue,
        fcp: audits["first-contentful-paint"].displayValue,
        failing: Object.values(audits)
          .filter((audit) => audit.score !== null && audit.score < 0.9 && audit.scoreDisplayMode === "binary")
          .map((audit) => audit.id),
        opportunities: Object.values(audits)
          .filter((audit) => audit.details?.type === "opportunity" && (audit.details.overallSavingsMs ?? 0) > 100)
          .map((audit) => `${audit.id} (${Math.round(audit.details.overallSavingsMs)} ms)`),
      };
      rows.push(row);
      const name = `${form}-${path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home"}`;
      writeFileSync(`${outDir}${name}.html`, result.report);
      console.log(
        `${form.padEnd(7)} ${path.padEnd(24)} P${String(row.performance).padStart(4)} A${String(row.accessibility).padStart(4)} BP${String(row.bestPractices).padStart(4)} SEO${String(row.seo).padStart(4)}  LCP ${row.lcp}  CLS ${row.cls}  TBT ${row.tbt}`,
      );
    }
  }
} finally {
  await chrome.kill();
}

writeFileSync(`${outDir}summary.json`, JSON.stringify(rows, null, 2));
