import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate.js";
import { publicCache } from "../../middleware/cache-control.js";
import { availability, getItem, getMenu } from "./menu.service.js";

const slug = z.string().regex(/^[a-z0-9-]+$/).max(80);

export const menuRouter = Router();

menuRouter.get("/", publicCache(30, 60), async (req, res) => {
  res.json({ data: await getMenu() });
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
