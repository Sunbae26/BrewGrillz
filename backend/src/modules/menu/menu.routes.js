import { Router } from "express";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { z } from "zod";
import { validate } from "../../middleware/validate.js";
import { publicCache } from "../../middleware/cache-control.js";
import { availability, getItem, getMenu } from "./menu.service.js";

const slug = z.string().regex(/^[a-z0-9-]+$/).max(80);

export const menuRouter = Router();

// The whole menu is the busiest request on the site. It only changes when the menu cache refreshes,
// so the JSON and its gzipped copy are made once per version, and browsers that already have it get a 304.
let packed = { menu: null };
function pack(menu) {
  if (packed.menu !== menu) {
    const body = JSON.stringify({ data: menu });
    packed = { menu, body, gzip: gzipSync(body), etag: `"m-${createHash("sha1").update(body).digest("base64url").slice(0, 20)}"` };
  }
  return packed;
}

menuRouter.get("/", publicCache(30, 60), async (req, res) => {
  const { body, gzip, etag } = pack(await getMenu());
  res.set("ETag", etag).set("Vary", "Accept-Encoding").type("json");
  if (req.fresh) return res.status(304).end();
  if (req.acceptsEncodings("gzip") === "gzip") return res.set("Content-Encoding", "gzip").send(gzip);
  res.send(body);
});

menuRouter.get("/items/:slug", publicCache(30, 60), validate(z.object({ slug }), "params"), async (req, res) => {
  res.json({ data: await getItem(req.valid.params.slug) });
});

menuRouter.get(
  "/availability",
  validate(
    z.object({
      items: z
        .string()
        .transform((value) => [...new Set(value.split(",").filter(Boolean))])
        .pipe(z.array(slug).min(1).max(40)),
    }),
  ),
  async (req, res) => {
    res.set("Cache-Control", "no-store").json({ data: await availability(req.valid.query.items) });
  },
);
