import { readdir, readFile } from "node:fs/promises";
import { test, expect } from "./helpers.js";

// Emails are written to backend/tmp/emails in local test mode. After the other tests have run,
// check one of each kind: no broken values, the brand and contact details are there, and it reads well on a phone.
const DIR = new URL("../../backend/tmp/emails/", import.meta.url);
const KINDS = [
  ["Order confirmed", /Your-BrewGrillz-order.*is-confirmed/],
  ["Order cancelled", /Your-BrewGrillz-order.*was-cancelled/],
  ["Order on the grill", /on-the-grill/i],
  ["Order ready", /is-ready-for-pickup/],
  ["New order (staff)", /New-pickup-order/],
  ["Refund", /Refund-for-your/],
  ["Table request received", /We-ve-got-your-table-request/],
  ["Table request (staff)", /New-table-request/],
  ["Table confirmed", /Your-table-is-confirmed/],
  ["Table not available", /About-your-table-request/],
  ["Table cancelled", /Your-table-booking/],
  ["Event enquiry received", /We-ve-got-your-event-enquiry/],
  ["Event enquiry (staff)", /New-event-enquiry/],
  ["Welcome to Rewards", /Welcome-to-the-BrewGrillz-Rewards-Club/],
  ["Password reset", /Reset-your-BrewGrillz-password/],
  ["Team invite", /added-to-the-BrewGrillz-dashboard/],
];

test("E2E-EMAIL one of each email reads correctly on a phone", async ({ page }) => {
  const files = (await readdir(DIR)).sort().reverse();
  const missing = [];
  const problems = [];
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [label, pattern] of KINDS) {
    const file = files.find((f) => pattern.test(f));
    if (!file) {
      missing.push(label);
      continue;
    }
    const html = await readFile(new URL(file, DIR), "utf8");
    if (/undefined|NaN|\[object Object\]|>null</.test(html)) problems.push(`${label}: broken value`);
    if (!/BrewGrillz|BREW<span/i.test(html)) problems.push(`${label}: no brand name`);
    if (!/163 Rochor Road|6312 2847|brewgrillz\.sg/.test(html)) problems.push(`${label}: no contact details`);
    await page.setContent(html);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 2) problems.push(`${label}: ${overflow}px too wide on a phone`);
    await page.screenshot({ path: `results/shots/email-${label.replace(/\W+/g, "-").toLowerCase()}.png`, fullPage: true });
  }
  expect(problems).toEqual([]);
  expect(missing, "run the API tests first so every email is produced").toEqual([]);
});
