import { readFile } from "node:fs/promises";
import { loadEnv } from "vite";

const fileEnv = loadEnv("production", process.cwd(), "");
const read = (name) => process.env[name] ?? fileEnv[name];
const STRICT =
  read("VERCEL_ENV") === "production" || read("REQUIRE_MENU_PRERENDER") === "true";

const BUILD = new URL("../build/client/", import.meta.url);
const MIN_BYTES = 20000;

// The pre-built menu page must contain the dishes (from the API at build time).
const html = await readFile(new URL("menu/index.html", BUILD), "utf8").catch(() => "");
const data = await readFile(new URL("menu.data", BUILD), "utf8").catch(() => "");
const ok = html.length > MIN_BYTES && /class="dish"/.test(html) && data.length > MIN_BYTES;

if (!ok) {
  const message = "The pre-built menu page has no dishes.";
  if (STRICT) {
    console.error(`${message} The build stopped so it isn't published empty. Check the API is running, then redeploy.`);
    process.exit(1);
  }
  console.warn(`${message} Fine for a local build without the API running (the menu then loads in the browser).`);
} else {
  console.log(`Pre-built menu page checked: ${(html.match(/class="dish"/g) || []).length} dishes.`);
}
