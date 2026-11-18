// Step 1 of going live: makes launch/filled/render.env and vercel.env with fresh, strong secrets.
//   node launch/prepare.mjs brewgrillz.sg            (staging: node launch/prepare.mjs brewgrillz.sg --staging)
// Your pasted keys are never overwritten unless you add --force.
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const domain = (process.argv[2] ?? "brewgrillz.sg").trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
const force = process.argv.includes("--force");

if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(domain)) {
  console.error(`"${domain}" doesn't look like a domain. Try: node launch/prepare.mjs brewgrillz.sg`);
  process.exit(1);
}

const filled = join(here, "filled");
mkdirSync(filled, { recursive: true });
for (const [template, output] of [["render.env.template", "render.env"], ["vercel.env.template", "vercel.env"]]) {
  const target = join(filled, output);
  if (existsSync(target) && !force) {
    console.log(`Kept launch/filled/${output} (already exists, your pasted keys are safe).`);
    continue;
  }
  const text = readFileSync(join(here, template), "utf8")
    .replaceAll("{{DOMAIN}}", domain)
    .replace(/GENERATED_SECRET/g, () => randomBytes(32).toString("hex"));
  writeFileSync(target, text, { mode: 0o600 });
  console.log(`Created launch/filled/${output}`);
}

console.log(`
Domain: ${domain}
  Website (Vercel): https://www.${domain}
  API (Render):     https://api.${domain}

Next: open launch/filled/render.env and replace every PASTE_... with the client's keys.
Then run: node launch/check.mjs`);
