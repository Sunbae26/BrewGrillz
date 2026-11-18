import { apiGet } from "./api.js";

export const STEPS = [
  { key: "PLACED", label: "Order received" },
  { key: "PREPARING", label: "On the grill" },
  { key: "READY", label: "Ready for pickup" },
  { key: "COMPLETED", label: "Collected" },
];
export const FINAL = ["COMPLETED", "CANCELLED", "REFUNDED"];
export const STATUS_LABEL = {
  PENDING_PAYMENT: "Waiting for payment",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  ...Object.fromEntries(STEPS.map((s) => [s.key, s.label])),
};

export const orderPath = (code, token) => `/orders/${encodeURIComponent(code)}?t=${encodeURIComponent(token)}`;
export const fetchOrder = (code, token, signal) => apiGet(orderPath(code, token), { signal });
