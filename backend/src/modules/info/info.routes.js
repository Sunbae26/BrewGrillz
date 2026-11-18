import { Router } from "express";
import { env } from "../../config/env.js";
import { restaurant } from "../../config/restaurant.js";
import { publicCache } from "../../middleware/cache-control.js";
import { getOperations } from "../settings/settings.service.js";
import { MIN_ONLINE_CENTS } from "../orders/orders.service.js";

export const infoRouter = Router();

infoRouter.get("/", publicCache(30, 60), async (req, res) => {
  const { ordersPaused, pausedMessage } = await getOperations();
  res.json({
    data: {
      restaurant,
      ordering: {
        pickupOnly: true,
        kitchen: { open: env.KITCHEN_OPEN, close: env.KITCHEN_CLOSE },
        prepMinutes: env.PICKUP_PREP_MINUTES,
        minOnlineCents: MIN_ONLINE_CENTS,
        paymentProvider: env.PAYMENT_PROVIDER,
        paused: ordersPaused,
        pausedMessage: ordersPaused ? pausedMessage : "",
      },
    },
  });
});
