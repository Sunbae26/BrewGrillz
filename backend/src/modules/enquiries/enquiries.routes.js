import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate.js";
import { limiter } from "../../utils/rate-limit.js";
import { clockTime, email, freeText, isoDate, personName, sgPhone } from "../../utils/validation.js";
import { createEnquiry, GUESTS, LEAD_HOURS, OCCASIONS } from "./enquiries.service.js";

export const enquiriesRouter = Router();

enquiriesRouter.get("/rules", (req, res) => {
  res.json({ data: { occasions: OCCASIONS, leadHours: LEAD_HOURS, guests: GUESTS } });
});

enquiriesRouter.post(
  "/",
  limiter({ windowMs: 60 * 60_000, limit: 5, message: "Too many enquiries from this device. Please call or WhatsApp us." }),
  validate(
    z.object({
      occasion: z.enum(OCCASIONS),
      eventDate: isoDate,
      startTime: clockTime,
      guests: z.number().int().min(GUESTS.min, `Events start at ${GUESTS.min} guests. For smaller groups, book a table.`).max(GUESTS.max),
      wholeVenue: z.boolean().default(false),
      budget: freeText(60).optional(),
      name: personName,
      email,
      phone: sgPhone,
      message: freeText(1000).optional(),
      agree: z.literal(true, { error: "Please accept the privacy policy to continue." }),
    }),
    "body",
  ),
  async (req, res) => {
    res.status(201).json({ data: await createEnquiry(req.valid.body) });
  },
);
