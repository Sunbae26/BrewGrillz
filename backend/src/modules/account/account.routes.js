import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { validate } from "../../middleware/validate.js";
import { optionalSgPhone, personName } from "../../utils/validation.js";
import { requireUser } from "../../middleware/auth.js";
import { bookingToken, orderToken } from "../../utils/order-token.js";
import { pointsHistory } from "../points/points.service.js";
import { publicUser } from "../auth/auth.service.js";
import { shapeOrder } from "../orders/orders.service.js";
import { shapeReservation } from "../reservations/reservations.service.js";
import { whatsappEnabled } from "../whatsapp/whatsapp.service.js";

// Everything on the "My account" page. Only orders and bookings made while signed in show here.
export const accountRouter = Router();

accountRouter.use(requireUser, (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

accountRouter.get("/orders", async (req, res) => {
  const orders = await prisma.order.findMany({
    where: {
      userId: req.user.id,
      NOT: [{ status: "PENDING_PAYMENT" }, { status: "CANCELLED", paidAt: null }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { items: { orderBy: { id: "asc" } }, events: { orderBy: { createdAt: "asc" } } },
  });
  res.json({ data: orders.map((order) => ({ ...shapeOrder(order), token: orderToken(order.code) })) });
});

accountRouter.get("/bookings", async (req, res) => {
  const bookings = await prisma.reservation.findMany({
    where: { userId: req.user.id },
    orderBy: { startsAt: "desc" },
    take: 50,
  });
  res.json({ data: bookings.map((b) => ({ ...shapeReservation(b), token: bookingToken(b.code) })) });
});

accountRouter.get("/points", async (req, res) => {
  res.json({ data: await pointsHistory(req.user.id) });
});

accountRouter.patch(
  "/profile",
  validate(z.object({ name: personName, phone: optionalSgPhone, whatsapp: z.boolean().optional() }), "body"),
  async (req, res) => {
    const { name, phone, whatsapp } = req.valid.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name,
        phone: phone || null,
        ...(whatsapp === undefined ? {} : { whatsappOptIn: whatsapp && Boolean(phone) && whatsappEnabled() }),
      },
    });
    res.json({ data: await publicUser(user) });
  },
);
