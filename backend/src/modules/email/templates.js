import { restaurant } from "../../config/restaurant.js";
import { formatPickup } from "../../utils/singapore-time.js";
import { env } from "../../config/env.js";

const SITE = env.SITE_URL;

const moneyFormat = new Intl.NumberFormat("en-SG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const money = (cents) => `S$${moneyFormat.format(cents / 100)}`;
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );

const RED = "#da3833";

function extras(item) {
  const parts = [
    item.variant,
    ...Object.values(item.options ?? {}),
    item.notes ? `“${item.notes}”` : null,
  ].filter(Boolean);
  return parts.length
    ? `<div style="color:#8a7f78;font-size:13px">${escape(parts.join(" · "))}</div>`
    : "";
}

function totals(order) {
  const rows = order.items
    .map(
      (item) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eee5dc">${item.quantity} × ${escape(item.nameSnapshot)}${extras(item)}</td><td style="padding:8px 0;border-bottom:1px solid #eee5dc;text-align:right;white-space:nowrap">${money(item.lineTotalCents)}</td></tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:15px">${rows}
<tr><td style="padding:12px 0 0;font-weight:bold">Total paid <span style="font-weight:normal;color:#8a7f78;font-size:12px">(incl. GST)</span></td><td style="padding:12px 0 0;text-align:right;font-weight:bold">${money(order.totalCents)}</td></tr></table>`;
}

function layout(title, body) {
  return `<!doctype html><html><body style="margin:0;background:#f4efe8;font-family:Arial,Helvetica,sans-serif;color:#1a1514">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#141110;color:#f5efe6;padding:20px 24px;border-radius:12px 12px 0 0"><b style="font-size:22px;letter-spacing:1px">BREW<span style="color:${RED}">GRILLZ</span></b><div style="font-size:12px;opacity:.7;margin-top:4px">Finest Grill Dining &amp; Bar · ${escape(restaurant.shortAddress)}</div></div>
<div style="background:#ffffff;padding:24px;border-radius:0 0 12px 12px">
<h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
${body}
</div>
<p style="font-size:12px;color:#8a7f78;text-align:center;margin-top:16px">${escape(restaurant.address)}<br>${restaurant.phone} · WhatsApp ${restaurant.whatsapp} · ${restaurant.email}</p>
</div></body></html>`;
}

const button = (href, label) =>
  `<p style="margin:20px 0 0"><a href="${href}" style="background:${RED};color:#ffffff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">${label}</a></p>`;

const orderNumber = (order) =>
  `<p style="font-size:15px;margin:0 0 4px">Order number</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:1px;margin:0 0 16px">${order.code}</p>`;

export function customerReceipt(order, orderUrl) {
  return {
    subject: `Your BrewGrillz order ${order.code} is confirmed`,
    html: layout(
      `Thanks, ${escape(order.customerName)}. Your order is in.`,
      `${orderNumber(order)}
<p style="font-size:15px;margin:0 0 4px">Pickup time</p>
<p style="font-size:17px;font-weight:bold;margin:0 0 16px">${escape(formatPickup(order.scheduledFor))}</p>
<p style="font-size:15px;margin:0 0 20px">Collect it at ${escape(restaurant.address)}. Show your order number at the counter.</p>
${totals(order)}
${button(orderUrl, "Track your order")}`,
    ),
  };
}

export function restaurantNotification(order) {
  const notes = order.notes
    ? `<p style="font-size:15px;background:#f4efe8;padding:12px;border-radius:8px;margin:0 0 16px"><strong>Notes:</strong> ${escape(order.notes)}</p>`
    : "";
  const pickup = formatPickup(order.scheduledFor);
  return {
    subject: `New pickup order ${order.code}, ${pickup}`,
    html: layout(
      `New pickup order ${order.code}`,
      `<p style="font-size:17px;font-weight:bold;margin:0 0 12px">Pickup: ${escape(pickup)}</p>
<p style="font-size:15px;margin:0 0 16px">${escape(order.customerName)}<br>${escape(order.customerPhone)}<br>${escape(order.customerEmail)}</p>
${notes}${totals(order)}`,
    ),
  };
}

export function orderPreparingEmail(order, orderUrl) {
  return {
    subject: `Your BrewGrillz order ${order.code} is on the grill`,
    html: layout(
      `${escape(order.customerName)}, your order is on the grill.`,
      `${orderNumber(order)}
<p style="font-size:15px;margin:0">Pickup ${escape(formatPickup(order.scheduledFor))}. We'll let you know the moment it's ready.</p>
${button(orderUrl, "Track your order")}`,
    ),
  };
}

export function orderReadyEmail(order, orderUrl) {
  return {
    subject: `Your BrewGrillz order ${order.code} is ready for pickup`,
    html: layout(
      `${escape(order.customerName)}, your order is ready.`,
      `${orderNumber(order)}
<p style="font-size:15px;margin:0 0 8px">Collect it at the counter and show your order number.</p>
<p style="font-size:15px;margin:0"><a href="${restaurant.mapsUrl}" style="color:${RED}">${escape(restaurant.address)}</a></p>
${button(orderUrl, "View your order")}`,
    ),
  };
}

export function orderCancelledEmail(order, { refundDue }) {
  const refund = refundDue
    ? `<p style="font-size:15px;margin:0 0 16px">You paid ${money(order.totalCents)} online. We are refunding it to your original payment method. Refunds usually reach you within 5 to 10 working days.</p>`
    : "";
  return {
    subject: `Your BrewGrillz order ${order.code} was cancelled`,
    html: layout(
      `Sorry, ${escape(order.customerName)}. We had to cancel your order.`,
      `<p style="font-size:15px;margin:0 0 16px">Order <strong>${order.code}</strong>, for pickup on ${escape(formatPickup(order.scheduledFor))}, has been cancelled.</p>${refund}
<p style="font-size:15px;margin:0">Questions? Call us on ${restaurant.phone} with your order number.</p>`,
    ),
  };
}

export function orderRefundedEmail(order, { amountCents, full }) {
  return {
    subject: `Refund for your BrewGrillz order ${order.code}`,
    html: layout(
      `${escape(order.customerName)}, your refund is on its way.`,
      `<p style="font-size:15px;margin:0 0 16px">We've refunded ${money(amountCents)}${full ? "" : ` of ${money(order.totalCents)}`} for order <strong>${order.code}</strong> to your original payment method. It usually takes 5 to 10 working days to appear.</p>
<p style="font-size:15px;margin:0">Questions? Call us on ${restaurant.phone} with your order number.</p>`,
    ),
  };
}

export function staffAlertEmail(subject, lines) {
  return {
    subject: `[BrewGrillz alert] ${subject}`,
    html: layout(
      escape(subject),
      lines.map((line) => `<p style="font-size:15px;margin:0 0 12px">${escape(line)}</p>`).join(""),
    ),
  };
}

export function testEmail() {
  return {
    subject: "BrewGrillz email test",
    html: layout(
      "Your email setup works",
      `<p style="font-size:15px;margin:0">If you can read this, the backend can send emails. Customers will get receipts and order updates from this address.</p>`,
    ),
  };
}

// ---------- table bookings ----------

const bookingWhen = (r) =>
  escape(
    `${formatPickup(r.startsAt)}`.replace(" at ", ", "),
  );

const bookingCard = (r) => `<table style="width:100%;border-collapse:collapse;font-size:15px;margin:0 0 16px">
<tr><td style="padding:6px 0;color:#8a7f78">Booking</td><td style="padding:6px 0;text-align:right;font-weight:bold">${r.code}</td></tr>
<tr><td style="padding:6px 0;color:#8a7f78">When</td><td style="padding:6px 0;text-align:right;font-weight:bold">${bookingWhen(r)}</td></tr>
<tr><td style="padding:6px 0;color:#8a7f78">Guests</td><td style="padding:6px 0;text-align:right;font-weight:bold">${r.partySize}</td></tr>
${r.occasion ? `<tr><td style="padding:6px 0;color:#8a7f78">Occasion</td><td style="padding:6px 0;text-align:right">${escape(r.occasion)}</td></tr>` : ""}
</table>`;

export function bookingReceivedEmail(r, link) {
  return {
    subject: `We've got your table request ${r.code}`,
    html: layout(
      `Thanks, ${escape(r.name)}. Your table request is in.`,
      `${bookingCard(r)}
<p style="font-size:15px;margin:0">Our team will confirm it shortly, usually within 15 minutes during opening hours. We'll email you as soon as it's confirmed.</p>
${button(link, "See your booking")}`,
    ),
  };
}

export function bookingNotification(r) {
  return {
    subject: `New table request ${r.code}: ${r.partySize} guests, ${formatPickup(r.startsAt)}`,
    html: layout(
      `New table request ${r.code}`,
      `${bookingCard(r)}
<p style="font-size:15px;margin:0 0 16px">${escape(r.name)}<br>${escape(r.phone)}<br>${escape(r.email)}</p>
${r.notes ? `<p style="font-size:15px;background:#f4efe8;padding:12px;border-radius:8px;margin:0"><strong>Notes:</strong> ${escape(r.notes)}</p>` : ""}
<p style="font-size:14px;color:#8a7f78;margin:16px 0 0">The table is held for this request. Confirm or decline it so the guest knows.</p>`,
    ),
  };
}

export function bookingConfirmedEmail(r, link) {
  return {
    subject: `Your table is confirmed: ${formatPickup(r.startsAt)}`,
    html: layout(
      `${escape(r.name)}, your table is confirmed.`,
      `${bookingCard(r)}
<p style="font-size:15px;margin:0 0 8px">We'll hold your table for 15 minutes after your booking time. Running late? Call us on ${restaurant.phone}.</p>
<p style="font-size:15px;margin:0"><a href="${restaurant.mapsUrl}" style="color:${RED}">${escape(restaurant.address)}</a></p>
${button(link, "See your booking")}`,
    ),
  };
}

export function bookingDeclinedEmail(r, { reason } = {}) {
  return {
    subject: `About your table request ${r.code}`,
    html: layout(
      `Sorry, ${escape(r.name)}. We can't confirm your table.`,
      `<p style="font-size:15px;margin:0 0 16px">We couldn't confirm your request for ${r.partySize} guests on ${bookingWhen(r)}.${reason ? ` ${escape(reason)}` : ""}</p>
<p style="font-size:15px;margin:0">Please choose another time, or call us on ${restaurant.phone} and we'll help you find one.</p>
${button(`${SITE}/reserve`, "Choose another time")}`,
    ),
  };
}

export function bookingCancelledEmail(r, { reason, byGuest } = {}) {
  return {
    subject: `Your table booking ${r.code} was cancelled`,
    html: layout(
      byGuest ? `Your booking is cancelled, ${escape(r.name)}.` : `Sorry, ${escape(r.name)}. We had to cancel your booking.`,
      `<p style="font-size:15px;margin:0 0 16px">Booking <strong>${r.code}</strong> for ${r.partySize} guests on ${bookingWhen(r)} has been cancelled.${reason ? ` ${escape(reason)}` : ""}</p>
<p style="font-size:15px;margin:0">${byGuest ? "Hope to see you another time." : `Questions? Call us on ${restaurant.phone}.`}</p>
${button(`${SITE}/reserve`, "Book another time")}`,
    ),
  };
}

// ---------- events and parties ----------

const enquiryCard = (e) => `<table style="width:100%;border-collapse:collapse;font-size:15px;margin:0 0 16px">
<tr><td style="padding:6px 0;color:#8a7f78">Reference</td><td style="padding:6px 0;text-align:right;font-weight:bold">${e.code}</td></tr>
<tr><td style="padding:6px 0;color:#8a7f78">Occasion</td><td style="padding:6px 0;text-align:right">${escape(e.occasion)}</td></tr>
<tr><td style="padding:6px 0;color:#8a7f78">Date</td><td style="padding:6px 0;text-align:right;font-weight:bold">${escape(e.eventDate)}, ${escape(e.startTime)}</td></tr>
<tr><td style="padding:6px 0;color:#8a7f78">Guests</td><td style="padding:6px 0;text-align:right;font-weight:bold">${e.guests}${e.wholeVenue ? " (whole venue)" : ""}</td></tr>
${e.budget ? `<tr><td style="padding:6px 0;color:#8a7f78">Budget</td><td style="padding:6px 0;text-align:right">${escape(e.budget)}</td></tr>` : ""}
</table>`;

export function enquiryReceivedEmail(e) {
  return {
    subject: `We've got your event enquiry ${e.code}`,
    html: layout(
      `Thanks, ${escape(e.name)}. Let's plan your ${escape(e.occasion.toLowerCase())}.`,
      `${enquiryCard(e)}
<p style="font-size:15px;margin:0">Our events team will get back to you within one working day with ideas, menus and prices. Nothing is booked or charged until you confirm.</p>`,
    ),
  };
}

export function enquiryNotification(e) {
  return {
    subject: `New event enquiry ${e.code}: ${e.occasion}, ${e.guests} guests, ${e.eventDate}`,
    html: layout(
      `New event enquiry ${e.code}`,
      `${enquiryCard(e)}
<p style="font-size:15px;margin:0 0 16px">${escape(e.name)}<br>${escape(e.phone)}<br>${escape(e.email)}</p>
${e.message ? `<p style="font-size:15px;background:#f4efe8;padding:12px;border-radius:8px;margin:0"><strong>Message:</strong> ${escape(e.message)}</p>` : ""}`,
    ),
  };
}

// ---------- accounts ----------

export function welcomeEmail(user) {
  return {
    subject: "Welcome to the BrewGrillz Rewards Club",
    html: layout(
      `Welcome to the club, ${escape(user.name.split(" ")[0])}!`,
      `<p style="font-size:15px;margin:0 0 16px">Your BrewGrillz account is ready. With it you can:</p>
<ul style="font-size:15px;margin:0 0 16px;padding-left:20px">
<li style="margin:0 0 6px">earn ${env.POINTS_PER_DOLLAR} point for every S$1 on pickup orders and dine-in bills,</li>
<li style="margin:0 0 6px">use ${env.POINTS_REDEEM_BLOCK} points for S$${(env.POINTS_REDEEM_VALUE_CENTS / 100).toFixed(0)} off a pickup order,</li>
<li style="margin:0 0 6px">see your orders and table bookings in one place.</li>
</ul>
<p style="font-size:15px;margin:0 0 16px">Eating in? Give our team your email or mobile when you pay, and we'll add the points to your account.</p>
${button(`${SITE}/menu`, "See the menu")}
<p style="font-size:13px;color:#8a7f78;margin:16px 0 0">If you didn't create this account, reply to this email and we'll remove it.</p>`,
    ),
  };
}

export function passwordResetEmail(name, resetUrl) {
  return {
    subject: "Reset your BrewGrillz password",
    html: layout(
      `Hi ${escape(name)}, reset your password`,
      `<p style="font-size:15px;margin:0 0 4px">Someone asked to reset the password for your BrewGrillz account. If it was you, use the button below. The link works for 1 hour.</p>
${button(resetUrl, "Choose a new password")}
<p style="font-size:13px;color:#8a7f78;margin:16px 0 0">If you didn't ask for this, ignore this email. Your password won't change.</p>`,
    ),
  };
}

const TEAM_ACCESS = {
  STAFF: "run online orders, table bookings, event enquiries and sold-out dishes, and add Rewards points",
  ADMIN: "do everything staff can, plus change prices, give refunds, manage the team and settings, and see reports",
};

export function teamInviteEmail(member, addedBy) {
  const role = member.role === "ADMIN" ? "an admin" : "a staff member";
  return {
    subject: "You've been added to the BrewGrillz dashboard",
    html: layout(
      `Welcome to the crew, ${escape(member.name.split(" ")[0])}`,
      `<p style="font-size:15px;margin:0 0 16px">${escape(addedBy)} has added you to the BrewGrillz dashboard as ${role}. You can now ${TEAM_ACCESS[member.role] ?? TEAM_ACCESS.STAFF}.</p>
<p style="font-size:15px;margin:0 0 16px">Sign in with <strong>${escape(member.email)}</strong>. ${escape(addedBy.split(" ")[0])} will give you your password.</p>
${button(`${SITE}/admin/login`, "Sign in to the dashboard")}
<p style="font-size:15px;margin:16px 0 0">After your first sign-in, please choose your own password with <a href="${SITE}/forgot-password" style="color:${RED}">Forgot password</a>.</p>`,
    ),
  };
}
