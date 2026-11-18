import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate.js";
import { requireRole } from "../../middleware/auth.js";
import { email, freeText, isoDate, newPassword, personName } from "../../utils/validation.js";
import { getOperations, updateOperations } from "../settings/settings.service.js";
import { listReservations, staffUpdate } from "../reservations/reservations.service.js";
import { listEnquiries, updateEnquiry } from "../enquiries/enquiries.service.js";
import { prisma } from "../../lib/prisma.js";
import { advanceOrder, boardOrders, cancelOrder, listOrders, refundOrder } from "./orders.admin.js";
import { adminMenu, updateMenuItem } from "./menu.admin.js";
import { addTeamMember, listTeam, updateTeamMember } from "./team.admin.js";
import { salesReport } from "./reports.admin.js";
import { addPoints, findMembers } from "./members.admin.js";

const orderCode = z.object({ code: z.string().regex(/^BG-\d{6}-[A-Z2-9]{4}$/) });
const bookingCode = z.object({ code: z.string().regex(/^BT-\d{6}-[A-Z2-9]{4}$/) });
const enquiryCode = z.object({ code: z.string().regex(/^EV-\d{6}-[A-Z2-9]{4}$/) });
const slug = z.string().regex(/^[a-z0-9-]+$/).max(80);
const ORDER_STATUSES = ["PENDING_PAYMENT", "PLACED", "PREPARING", "READY", "COMPLETED", "CANCELLED", "REFUNDED"];
const ENQUIRY_STATUSES = ["NEW", "CONTACTED", "CONFIRMED", "DECLINED", "CLOSED"];

// Staff dashboard. STAFF runs orders, bookings, enquiries, sold-out switches and Rewards points;
// ADMIN also changes prices, refunds, settings, the team and sees reports.
export const adminRouter = Router();

adminRouter.use(requireRole("STAFF", "ADMIN"), (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// Badges on the dashboard tabs
adminRouter.get("/summary", async (req, res) => {
  const [orders, bookings, enquiries, operations] = await Promise.all([
    prisma.order.count({ where: { status: "PLACED" } }),
    prisma.reservation.count({ where: { status: "REQUESTED", startsAt: { gt: new Date() } } }),
    prisma.eventEnquiry.count({ where: { status: "NEW" } }),
    getOperations(),
  ]);
  res.json({ data: { newOrders: orders, bookingRequests: bookings, newEnquiries: enquiries, ordersPaused: operations.ordersPaused } });
});

// ---------- orders ----------
adminRouter.get("/orders", async (req, res) => {
  res.json({ data: await boardOrders() });
});

adminRouter.get("/orders/all", validate(z.object({ status: z.enum(ORDER_STATUSES).optional() })), async (req, res) => {
  res.json({ data: await listOrders(req.valid.query) });
});

adminRouter.post("/orders/:code/advance", validate(orderCode, "params"), async (req, res) => {
  res.json({ data: await advanceOrder(req.valid.params.code) });
});

adminRouter.post(
  "/orders/:code/cancel",
  validate(orderCode, "params"),
  validate(z.object({ reason: freeText(200).optional() }).default({}), "body"),
  async (req, res) => {
    res.json({ data: await cancelOrder(req.valid.params.code, req.valid.body) });
  },
);

adminRouter.post(
  "/orders/:code/refund",
  requireRole("ADMIN"),
  validate(orderCode, "params"),
  validate(z.object({ amountCents: z.number().int().min(1).optional() }).default({}), "body"),
  async (req, res) => {
    res.json({ data: await refundOrder(req.valid.params.code, req.valid.body) });
  },
);

// ---------- table bookings ----------
adminRouter.get("/reservations", validate(z.object({ date: isoDate.optional() })), async (req, res) => {
  res.json({ data: await listReservations(req.valid.query) });
});

adminRouter.post(
  "/reservations/:code/:action",
  validate(bookingCode.extend({ action: z.enum(["confirm", "decline", "cancel", "complete", "no-show"]) }), "params"),
  validate(z.object({ table: freeText(20).optional(), reason: freeText(200).optional() }).default({}), "body"),
  async (req, res) => {
    res.json({ data: await staffUpdate(req.valid.params.code, req.valid.params.action, req.valid.body) });
  },
);

// ---------- event enquiries ----------
adminRouter.get("/enquiries", validate(z.object({ status: z.enum(ENQUIRY_STATUSES).optional() })), async (req, res) => {
  res.json({ data: await listEnquiries(req.valid.query) });
});

adminRouter.patch(
  "/enquiries/:code",
  validate(enquiryCode, "params"),
  validate(z.object({ status: z.enum(ENQUIRY_STATUSES).optional(), staffNote: freeText(500).optional() }), "body"),
  async (req, res) => {
    res.json({ data: await updateEnquiry(req.valid.params.code, req.valid.body) });
  },
);

// ---------- menu ----------
adminRouter.get("/menu", async (req, res) => {
  res.json({ data: await adminMenu() });
});

adminRouter.patch(
  "/menu/:kind/:slug",
  validate(z.object({ kind: z.enum(["items", "drinks"]), slug }), "params"),
  validate(
    z
      .object({
        isAvailable: z.boolean(),
        priceCents: z.number().int().min(50).max(100000),
        prices: z.array(z.number().int().min(50).max(500000).nullable()).max(4),
      })
      .partial()
      .refine((v) => Object.keys(v).length > 0, "Nothing to update"),
    "body",
  ),
  (req, res, next) => {
    // staff can mark things sold out; only admins change prices
    const { priceCents, prices } = req.valid.body;
    if ((priceCents !== undefined || prices !== undefined) && req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Only an admin can change prices." });
    next();
  },
  async (req, res) => {
    res.json({ data: await updateMenuItem(req.valid.params.kind, req.valid.params.slug, req.valid.body) });
  },
);

// ---------- Rewards Club ----------
adminRouter.get("/members", validate(z.object({ q: z.string().trim().min(2).max(80) })), async (req, res) => {
  res.json({ data: await findMembers(req.valid.query.q) });
});

adminRouter.post(
  "/members/:id/points",
  validate(z.object({ id: z.coerce.number().int().positive() }), "params"),
  validate(
    z
      .object({
        billCents: z.number().int().min(100).max(1_000_000).optional(),
        points: z.number().int().min(-100_000).max(100_000).refine((n) => n !== 0).optional(),
        note: freeText(120).optional(),
      })
      .refine((v) => (v.billCents === undefined) !== (v.points === undefined), "Enter the bill amount or the points, not both."),
    "body",
  ),
  (req, res, next) => {
    // staff add points for a bill; only admins make free-form corrections
    if (req.valid.body.points !== undefined && req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Only an admin can correct points directly." });
    next();
  },
  async (req, res) => {
    res.json({ data: await addPoints(req.valid.params.id, req.valid.body, req.user) });
  },
);

// ---------- settings ----------
adminRouter.get("/settings", async (req, res) => {
  res.json({ data: await getOperations() });
});

adminRouter.patch(
  "/settings",
  validate(
    z.object({
      ordersPaused: z.boolean().optional(),
      pausedMessage: freeText(200).optional(),
      slotCapacity: z.number().int().min(0).max(100).optional(),
      closedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(60).optional(),
    }),
    "body",
  ),
  (req, res, next) => {
    // anyone on shift can pause online orders; only admins change the slot limit and closed days
    const { slotCapacity, closedDates } = req.valid.body;
    if ((slotCapacity !== undefined || closedDates !== undefined) && req.user.role !== "ADMIN")
      return res.status(403).json({ error: "Only an admin can change these settings." });
    next();
  },
  async (req, res) => {
    res.json({ data: await updateOperations(req.valid.body) });
  },
);

// ---------- team (admins) ----------
adminRouter.get("/team", requireRole("ADMIN"), async (req, res) => {
  res.json({ data: await listTeam() });
});

adminRouter.post(
  "/team",
  requireRole("ADMIN"),
  validate(
    z.object({
      name: personName,
      email,
      password: newPassword,
      role: z.enum(["ADMIN", "STAFF"]),
      confirmExisting: z.boolean().optional(),
    }),
    "body",
  ),
  async (req, res) => {
    res.status(201).json({ data: await addTeamMember(req.user, req.valid.body) });
  },
);

adminRouter.patch(
  "/team/:email",
  requireRole("ADMIN"),
  validate(z.object({ email }), "params"),
  validate(z.object({ role: z.enum(["ADMIN", "STAFF", "CUSTOMER"]) }), "body"),
  async (req, res) => {
    res.json({ data: await updateTeamMember(req.user, req.valid.params.email, req.valid.body.role) });
  },
);

// ---------- reports (admins) ----------
adminRouter.get(
  "/reports",
  requireRole("ADMIN"),
  validate(z.object({ days: z.coerce.number().int().refine((d) => [1, 7, 30].includes(d)).default(7) })),
  async (req, res) => {
    res.json({ data: await salesReport(req.valid.query.days) });
  },
);
