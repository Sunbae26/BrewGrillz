import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { validate } from "../../middleware/validate.js";
import { limiter } from "../../utils/rate-limit.js";
import { email } from "../../utils/validation.js";

export const newsletterRouter = Router();

newsletterRouter.post(
  "/",
  limiter({ windowMs: 60 * 60_000, limit: 10, message: "Too many sign-ups from this device. Please try again later." }),
  validate(z.object({ email, source: z.string().regex(/^[a-z0-9-]{1,40}$/).optional() }), "body"),
  async (req, res) => {
    await prisma.newsletterSubscriber.upsert({
      where: { email: req.valid.body.email },
      update: {},
      create: req.valid.body,
    });
    res.status(201).json({ data: { subscribed: true } });
  },
);
