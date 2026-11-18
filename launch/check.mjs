// Step 2 of going live: checks launch/filled/*.env before you paste them into Render and Vercel.
//   node launch/check.mjs
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const problems = [];
const warnings = [];

const read = (name) => {
  const path = join(here, "filled", name);
  if (!existsSync(path)) {
    console.error(`launch/filled/${name} is missing. Run: node launch/prepare.mjs brewgrillz.sg`);
    process.exit(1);
  }
  const values = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2].trim();
  }
  return values;
};

const render = read("render.env");
const vercel = read("vercel.env");

for (const [file, values] of [["render.env", render], ["vercel.env", vercel]])
  for (const [key, value] of Object.entries(values)) if (value.startsWith("PASTE_")) problems.push(`${file}: ${key} still says ${value}`);

const rule = (key, test, message) => {
  const value = render[key];
  if (value && !value.startsWith("PASTE_") && !test(value)) problems.push(`${key}: ${message}`);
};
rule("DATABASE_URL", (v) => /^postgres(ql)?:\/\/.+@.+\/.+/.test(v), "should look like postgresql://user:password@host/dbname");
rule("DATABASE_URL", (v) => /sslmode=require/.test(v), "Neon needs ?sslmode=require at the end");
rule("DATABASE_URL", (v) => !/channel_binding/.test(v), "remove &channel_binding=require (Prisma doesn't need it)");
rule("STRIPE_SECRET_KEY", (v) => /^(sk|rk)_(live|test)_/.test(v), "should start with sk_live_ (or sk_test_ on staging)");
rule("STRIPE_WEBHOOK_SECRET", (v) => v.startsWith("whsec_"), "should start with whsec_");
rule("RESEND_API_KEY", (v) => v.startsWith("re_"), "should start with re_");
for (const key of ["RESTAURANT_EMAIL", "EMAIL_REPLY_TO"]) rule(key, (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "should be an email address");
if (render.APP_ENV !== "staging") rule("EMAIL_FROM", (v) => !/resend\.dev/.test(v), "must be on your own domain (verify the domain in Resend first)");
else warnings.push("APP_ENV=staging: emails come from Resend's test sender and only reach the email you signed up to Resend with. Set APP_ENV=production for the live site.");

if (render.STRIPE_SECRET_KEY?.includes("_test_"))
  warnings.push("STRIPE_SECRET_KEY is a TEST key. Fine for staging; for the live site use the client's sk_live_ key.");

const secrets = ["ORDER_TOKEN_SECRET", "SESSION_SECRET", "JWT_SECRET", "ADMIN_SETUP_KEY"];
for (const key of secrets) if (!render[key] || render[key].length < 32) problems.push(`${key}: should be at least 32 characters (run prepare.mjs again with --force)`);
if (new Set(secrets.map((key) => render[key])).size !== secrets.length) problems.push("ORDER_TOKEN_SECRET, SESSION_SECRET, JWT_SECRET and ADMIN_SETUP_KEY must all be different");

if (render.WHATSAPP_PROVIDER === "off") warnings.push("WhatsApp is off. Emails still go out. Switch to meta when the templates are approved.");
else if (render.WHATSAPP_PROVIDER === "meta" && (!render.WHATSAPP_TOKEN || !render.WHATSAPP_PHONE_NUMBER_ID))
  problems.push("WHATSAPP_PROVIDER=meta needs WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID (or set it to off)");

if (vercel.VITE_SITE_URL !== render.SITE_URL) problems.push(`vercel.env VITE_SITE_URL (${vercel.VITE_SITE_URL}) should match render.env SITE_URL (${render.SITE_URL})`);
if (!render.CORS_ORIGINS.split(",").includes(render.SITE_URL)) problems.push(`CORS_ORIGINS should include ${render.SITE_URL}`);
if (/localhost/.test(render.CORS_ORIGINS)) problems.push("CORS_ORIGINS must not include localhost on the live site");

const vercelJson = readFileSync(join(here, "../frontend/vercel.json"), "utf8");
const apiHost = vercel.BUILD_API_URL.replace(/\/api$/, "");
if (!vercelJson.includes(new URL(apiHost).host) && !vercelJson.includes("onrender.com"))
  problems.push(`frontend/vercel.json: the /api rewrite should point at ${apiHost}`);

for (const warning of warnings) console.log(`Note: ${warning}`);
if (problems.length) {
  console.log(`\nNot ready yet. Fix these ${problems.length} item(s):`);
  for (const problem of problems) console.log(`  - ${problem}`);
  process.exit(1);
}

console.log(`
All good. Ready to paste.

1. Render > brewgrillz-api > Environment > Add from .env
   Paste everything in launch/filled/render.env, then Save (Render redeploys by itself).
2. Vercel > brewgrillz > Settings > Environment Variables
   Paste everything in launch/filled/vercel.env (Production), then Redeploy.
3. Stripe > Developers > Webhooks > Add endpoint
   URL: ${apiHost}/api/webhooks/stripe
   Events: checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded
4. Owner account: open ${render.SITE_URL}/admin/login once and use this setup key:
   ${render.ADMIN_SETUP_KEY}
   Keep this key private. The form disappears after the owner account exists.`);
