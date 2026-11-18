import { randomInt } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { HttpError, notFound } from "../../utils/http-error.js";
import { singaporeInstant, singaporeParts, toMinutes } from "../../utils/singapore-time.js";
import { sendEmail } from "../email/email.service.js";
import { enquiryNotification, enquiryReceivedEmail } from "../email/templates.js";

export const OCCASIONS = ["Birthday", "Office party", "Anniversary", "Farewell", "Watch party", "Private dining", "Other"];
export const LEAD_HOURS = 24;
export const GUESTS = { min: 8, max: 150 };
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCode() {
  const { date } = singaporeParts();
  const suffix = Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return `EV-${date.slice(2).replace(/-/g, "")}-${suffix}`;
}

export async function createEnquiry(input) {
  const at = singaporeInstant(input.eventDate, toMinutes(input.startTime));
  if (at.getTime() < Date.now() + LEAD_HOURS * 3_600_000)
    throw new HttpError(400, `Events need at least ${LEAD_HOURS} hours' notice. For tonight, please call us.`, { code: "TOO_SOON" });
  if (at.getTime() > Date.now() + 365 * 86_400_000) throw new HttpError(400, "Choose a date within the next year.");

  // One email address can send 3 enquiries a day (stops spam filling the inbox).
  const today = await prisma.eventEnquiry.count({
    where: { email: input.email, createdAt: { gt: new Date(Date.now() - 86_400_000) } },
  });
  if (today >= 3) throw new HttpError(429, "You've sent a few enquiries today already. We'll be in touch soon, or call us.");

  let enquiry;
  for (let attempt = 0; attempt < 3 && !enquiry; attempt += 1) {
    try {
      enquiry = await prisma.eventEnquiry.create({
        data: {
          code: newCode(),
          occasion: input.occasion,
          eventDate: input.eventDate,
          startTime: input.startTime,
          guests: input.guests,
          wholeVenue: input.wholeVenue,
          budget: input.budget || null,
          name: input.name,
          email: input.email,
          phone: input.phone,
          message: input.message || null,
          termsAcceptedAt: new Date(),
        },
      });
    } catch (error) {
      if (error.code !== "P2002") throw error;
    }
  }
  if (!enquiry) throw new HttpError(503, "Could not send your enquiry. Please try again.");
  Promise.allSettled([
    sendEmail({ to: enquiry.email, ...enquiryReceivedEmail(enquiry) }),
    sendEmail({ to: env.RESTAURANT_EMAIL, ...enquiryNotification(enquiry) }),
  ]).then((results) =>
    results.filter((r) => r.status === "rejected").forEach((r) => console.error("Enquiry email failed:", r.reason?.message ?? r.reason)),
  );
  return { code: enquiry.code };
}

export async function listEnquiries({ status }) {
  return prisma.eventEnquiry.findMany({
    where: status ? { status } : { status: { in: ["NEW", "CONTACTED", "CONFIRMED"] } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function updateEnquiry(code, { status, staffNote }) {
  const found = await prisma.eventEnquiry.findUnique({ where: { code } });
  if (!found) throw notFound("Enquiry not found");
  return prisma.eventEnquiry.update({
    where: { code },
    data: { ...(status ? { status } : {}), ...(staffNote !== undefined ? { staffNote } : {}) },
  });
}
