import express, { Router } from "express";
import { providerFor } from "./providers/index.js";
import { markPaid, markRefunded } from "../orders/orders.service.js";

// Mounted before express.json(): the signature is checked against the raw body.
export const webhooksRouter = Router();

webhooksRouter.use(express.raw({ type: "application/json", limit: "1mb" }));

const matchOrder = (event) => {
  const options = [
    event.providerOrderId ? { providerOrderId: event.providerOrderId } : null,
    event.orderCode ? { code: event.orderCode } : null,
  ].filter(Boolean);
  return options.length ? { OR: options } : null;
};

webhooksRouter.post("/stripe", async (req, res) => {
  const event = providerFor("stripe").parseWebhook(req.body.toString("utf8"), req.headers);
  if (event?.type === "paid")
    await markPaid({
      where: matchOrder(event) ?? { id: -1 },
      paymentId: event.paymentId,
      amountCents: event.amountCents,
      currency: event.currency,
      providerName: "stripe",
      providerOrderId: event.providerOrderId,
    });
  if (event?.type === "refunded") await markRefunded(event);
  res.json({ received: true });
});
