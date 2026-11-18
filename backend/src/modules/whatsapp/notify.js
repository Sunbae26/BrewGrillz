import { restaurant } from "../../config/restaurant.js";
import { formatPickup } from "../../utils/singapore-time.js";
import { notifyCustomer } from "./whatsapp.service.js";

const money = (cents) => `S$${(cents / 100).toFixed(2)}`;
const firstName = (name) => String(name).trim().split(/\s+/)[0];

const send = (order, template, params) =>
  notifyCustomer({
    phone: order.customerPhone,
    optIn: order.whatsappOptIn,
    template,
    params: [firstName(order.customerName), order.code, ...params],
  });

export const whatsappOrder = {
  placed: (order, link) => send(order, "bgz_order_placed", [formatPickup(order.scheduledFor), money(order.totalCents), link]),
  preparing: (order, link) => send(order, "bgz_order_preparing", [link]),
  ready: (order, link) => send(order, "bgz_order_ready", [link]),
  cancelled: (order, refundDue) =>
    send(order, "bgz_order_cancelled", [
      refundDue ? "Your payment will be refunded within 5 to 10 working days." : "No payment was taken.",
      restaurant.phone,
    ]),
};

const sendBooking = (r, template, params) =>
  notifyCustomer({ phone: r.phone, optIn: r.whatsappOptIn, template, params: [firstName(r.name), r.code, ...params] });

export const whatsappBooking = {
  received: (r, link) => sendBooking(r, "bgz_booking_received", [formatPickup(r.startsAt), String(r.partySize), link]),
  confirmed: (r, link) => sendBooking(r, "bgz_booking_confirmed", [formatPickup(r.startsAt), String(r.partySize), link]),
  declined: (r) => sendBooking(r, "bgz_booking_declined", [formatPickup(r.startsAt), restaurant.phone]),
  cancelled: (r) => sendBooking(r, "bgz_booking_cancelled", [formatPickup(r.startsAt), restaurant.phone]),
};
