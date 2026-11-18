import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate.js";
import { limiter } from "../../utils/rate-limit.js";
import { email, freeText, isoDate, personName, sgPhone } from "../../utils/validation.js";
import { HttpError } from "../../utils/http-error.js";
import { isValidBookingToken } from "../../utils/order-token.js";
import { env } from "../../config/env.js";
import { availability, bookingDays, cancelByCustomer, createReservation, getReservation } from "./reservations.service.js";

const CODE = /^BT-\d{6}-[A-Z2-9]{4}$/;
const code = z.object({ code: z.string().regex(CODE) });
const tokenQuery = z.object({ t: z.string().min(10).max(64) });

const bookingBody = z.object({
  idempotencyKey: z.string().uuid(),
  startsAt: z.string().datetime(),
  partySize: z.number().int().min(1).max(40),
  name: personName,
  email,
  phone: sgPhone,
  whatsapp: z.boolean().default(false),
  occasion: z.enum(["Birthday", "Anniversary", "Date night", "Business", "Celebration", "Other"]).optional(),
  notes: freeText(300).optional(),
  agree: z.literal(true, { error: "Please accept the booking terms to continue." }),
});

const requireToken = (req, res, next) => {
  if (!isValidBookingToken(req.valid.params.code, req.valid.query.t)) return next(new HttpError(404, "Booking not found"));
  next();
};

export const reservationsRouter = Router();

reservationsRouter.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

reservationsRouter.get("/rules", (req, res) => {
  res.json({
    data: {
      maxParty: env.MAX_PARTY_SIZE,
      holdMinutes: env.BOOKING_MINUTES,
      first: env.BOOKING_FIRST,
      last: env.BOOKING_LAST,
    },
  });
});

reservationsRouter.get("/days", async (req, res) => {
  res.json({ data: await bookingDays() });
});

reservationsRouter.get("/availability", validate(z.object({ date: isoDate })), async (req, res) => {
  res.json({ data: await availability(req.valid.query.date) });
});

reservationsRouter.post(
  "/",
  limiter({ windowMs: 60 * 60_000, limit: 10, message: "Too many booking requests from this device. Please call us." }),
  validate(bookingBody, "body"),
  async (req, res) => {
    res.status(201).json({ data: await createReservation(req.valid.body, req.user) });
  },
);

reservationsRouter.get("/:code", validate(code, "params"), validate(tokenQuery), requireToken, async (req, res) => {
  res.json({ data: await getReservation(req.valid.params.code) });
});

reservationsRouter.post(
  "/:code/cancel",
  limiter({ windowMs: 15 * 60_000, limit: 20 }),
  validate(code, "params"),
  validate(tokenQuery),
  requireToken,
  async (req, res) => {
    res.json({ data: await cancelByCustomer(req.valid.params.code) });
  },
);
