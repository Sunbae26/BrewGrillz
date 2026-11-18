import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate.js";
import { limiter } from "../../utils/rate-limit.js";
import { email, freeText, personName, sgPhone } from "../../utils/validation.js";
import { HttpError } from "../../utils/http-error.js";
import { isValidOrderToken } from "../../utils/order-token.js";
import { checkOrder, confirmOrder, createOrder, findOrderAccess, getOrder } from "./orders.service.js";
import { pickupDays } from "./pickup.service.js";

const CODE = /^BG-\d{6}-[A-Z2-9]{4}$/;
const slug = z.string().regex(/^[a-z0-9-]+$/).max(80);
const code = z.object({ code: z.string().regex(CODE) });
const tokenQuery = z.object({ t: z.string().min(10).max(64) });
const shortText = z.string().trim().min(1).max(60);

const orderBody = z.object({
  idempotencyKey: z.string().uuid(),
  items: z
    .array(
      z.object({
        slug,
        quantity: z.number().int().min(1).max(20),
        variant: shortText.nullish(),
        options: z.record(shortText, shortText).refine((o) => Object.keys(o).length <= 5).optional(),
        notes: freeText(140).optional(),
      }),
    )
    .min(1, "Your cart is empty.")
    .max(30),
  customer: z.object({
    name: personName,
    email,
    phone: sgPhone,
    whatsapp: z.boolean().default(false),
  }),
  pickupAt: z.string().datetime(),
  notes: freeText(300).optional(),
  agree: z.literal(true, { error: "Please accept the terms to continue." }),
  pointsToRedeem: z.number().int().min(0).max(100000).optional(),
  replaces: z.object({ code: z.string().regex(CODE), token: z.string().min(10).max(64) }).optional(),
});

const requireToken = (req, res, next) => {
  if (!isValidOrderToken(req.valid.params.code, req.valid.query.t))
    return next(new HttpError(404, "Order not found"));
  next();
};

export const ordersRouter = Router();

ordersRouter.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

ordersRouter.get("/pickup-slots", async (req, res) => {
  res.json({ data: await pickupDays() });
});

ordersRouter.post("/", limiter({ windowMs: 60_000, limit: 20 }), validate(orderBody, "body"), async (req, res) => {
  res.status(201).json({ data: await createOrder(req.valid.body, req.user) });
});

ordersRouter.post(
  "/find",
  limiter({ windowMs: 15 * 60_000, limit: 10, message: "Too many tries. Please wait a few minutes, or call us." }),
  validate(
    z.object({
      code: z.string().trim().toUpperCase().pipe(z.string().regex(CODE, "Enter your order number, like BG-261117-AB2C.")),
      email,
    }),
    "body",
  ),
  async (req, res) => {
    res.json({ data: await findOrderAccess(req.valid.body) });
  },
);

ordersRouter.post("/:code/confirm", validate(code, "params"), validate(tokenQuery), requireToken, async (req, res) => {
  res.json({ data: await confirmOrder(req.valid.params.code, req.body) });
});

ordersRouter.post(
  "/:code/check",
  limiter({ windowMs: 60_000, limit: 40 }),
  validate(code, "params"),
  validate(tokenQuery),
  requireToken,
  async (req, res) => {
    res.json({ data: await checkOrder(req.valid.params.code) });
  },
);

ordersRouter.get("/:code", validate(code, "params"), validate(tokenQuery), requireToken, async (req, res) => {
  res.json({ data: await getOrder(req.valid.params.code) });
});
