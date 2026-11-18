import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

// The tracking link token is an HMAC of the order code, so it can't be guessed
// and nothing extra has to be stored. Changing ORDER_TOKEN_SECRET invalidates old links.
export const orderToken = (code) =>
  createHmac("sha256", env.ORDER_TOKEN_SECRET)
    .update(code)
    .digest("base64url")
    .slice(0, 32);

export function isValidOrderToken(code, token) {
  if (typeof token !== "string") return false;
  const expected = Buffer.from(orderToken(code));
  const received = Buffer.from(token);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

// Same idea for table bookings and event enquiries (prefixed so a token for one can't open another).
export const bookingToken = (code) => orderToken(`booking:${code}`);
export const isValidBookingToken = (code, token) => isValidOrderToken(`booking:${code}`, token);
export const enquiryToken = (code) => orderToken(`enquiry:${code}`);
