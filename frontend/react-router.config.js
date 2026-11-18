import { loadEnv } from "vite";

const mode = process.env.NODE_ENV === "development" ? "development" : "production";
const fileEnv = loadEnv(mode, process.cwd(), "");
const read = (name) => process.env[name] ?? fileEnv[name];

// On Vercel production builds the menu MUST come from the API, or the build stops
// (so an empty menu page is never published).
const STRICT = read("VERCEL_ENV") === "production" || read("REQUIRE_MENU_PRERENDER") === "true";

function buildApiUrl() {
  const explicit = read("BUILD_API_URL");
  const configured = read("VITE_API_URL");
  const candidate = explicit || (configured?.startsWith("http") ? configured : null);
  if (candidate) return candidate.replace(/\/$/, "");
  const reason = configured
    ? `VITE_API_URL is "${configured}", which the build can't call. Set BUILD_API_URL to the API's full address, for example https://brewgrillz-api.onrender.com/api.`
    : "VITE_API_URL is not set.";
  if (STRICT) throw new Error(`The menu page can't be pre-built: ${reason}`);
  console.warn(`${reason} Falling back to http://localhost:4000/api for pre-built pages.`);
  return "http://localhost:4000/api";
}

const API_URL = buildApiUrl();
process.env.BUILD_API_URL = API_URL;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Wakes a sleeping free-tier API before pre-rendering, and stops the build if it never answers.
async function checkMenuApi() {
  const attempts = STRICT ? 4 : 1;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${API_URL}/menu`, { signal: AbortSignal.timeout(STRICT ? 25_000 : 5000) });
      if (!response.ok) throw new Error(`API responded ${response.status}`);
      const { data } = await response.json();
      if (!data?.categories?.length) throw new Error("API returned no menu");
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(5000);
    }
  }
  if (STRICT)
    throw new Error(
      `Menu API at ${API_URL} was unreachable during the build (${lastError.message}). The build stopped so the live menu page isn't published empty. Check the API is running, then redeploy.`,
    );
  console.warn(`Menu API unavailable during build (${lastError.message}). The menu page will load the menu in the browser instead.`);
}

export default {
  appDirectory: "app",
  ssr: false,
  async prerender() {
    await checkMenuApi();
    return ["/", "/menu", "/checkout", "/track", "/styleguide", "/reserve", "/bar", "/our-place", "/events", "/rewards", "/login", "/register", "/forgot-password", "/reset-password", "/account", "/admin/login", "/privacy", "/terms", "/404"];
  },
  future: {
    v8_middleware: true,
    v8_passThroughRequests: true,
    v8_splitRouteModules: true,
    v8_trailingSlashAwareDataRequests: true,
    v8_viteEnvironmentApi: true,
  },
};
