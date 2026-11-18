import { createServer } from "node:http";
import { constants, createBrotliCompress, createGzip } from "node:zlib";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../build/client", import.meta.url));
const port = Number(process.env.PORT ?? 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".webmanifest", ".xml", ".txt", ".svg"]);

function encoder(req, extension) {
  if (!COMPRESSIBLE.has(extension)) return null;
  const accepted = String(req.headers["accept-encoding"] ?? "");
  if (/\bbr\b/.test(accepted))
    return {
      name: "br",
      stream: () =>
        createBrotliCompress({
          params: { [constants.BROTLI_PARAM_QUALITY]: 5 },
        }),
    };
  if (/\bgzip\b/.test(accepted))
    return { name: "gzip", stream: () => createGzip({ level: 6 }) };
  return null;
}

// Pages that aren't pre-built: served the app shell, which loads them in the browser.
const SPA_ROUTES = [/^\/order\/.+/, /^\/reserve\/.+/, /^\/admin(\/(?!login\/?$).*)?$/];

const isFile = async (path) =>
  (await stat(path).catch(() => null))?.isFile() ?? false;

async function resolve(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(
    /^(\.\.[/\\])+/,
    "",
  );
  const candidates = [join(root, clean), join(root, clean, "index.html")];
  for (const candidate of candidates) {
    if (candidate.startsWith(root) && (await isFile(candidate)))
      return { path: candidate, status: 200 };
  }
  if (SPA_ROUTES.some((pattern) => pattern.test(urlPath)))
    return { path: join(root, "__spa-fallback.html"), status: 200 };
  return { path: join(root, "404.html"), status: 404 };
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  const { path, status } = await resolve(pathname);
  const extension = extname(path);
  const type = types[extension] ?? "application/octet-stream";
  const cache = pathname.startsWith("/assets/")
    ? "public, max-age=31536000, immutable"
    : /^\/(brand|images)\//.test(pathname)
      ? "public, max-age=604800, stale-while-revalidate=86400"
      : "public, max-age=0, must-revalidate";
  const encoding = encoder(req, extension);
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": cache,
    Vary: "Accept-Encoding",
    ...(encoding ? { "Content-Encoding": encoding.name } : {}),
  });
  const file = createReadStream(path);
  if (encoding) file.pipe(encoding.stream()).pipe(res);
  else file.pipe(res);
}).listen(port, () => console.log(`BrewGrillz preview on http://localhost:${port}`));
