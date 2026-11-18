import { z } from "zod";

const EMAIL =
  /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9_%+-])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;
const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;
const SG_NUMBER = /^[3689]\d{7}$/;

export const SG_PHONE_MESSAGE =
  "Enter a Singapore number: 8 digits starting with 3, 6, 8 or 9, like 9123 4567.";

export function normalizeSgPhone(value) {
  const raw = String(value ?? "").trim();
  if (!/^\+?[\d ]+$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+") && !digits.startsWith("65")) return null;
  if (digits.length === 10 && digits.startsWith("65")) digits = digits.slice(2);
  if (!SG_NUMBER.test(digits)) return null;
  return `+65 ${digits.slice(0, 4)} ${digits.slice(4)}`;
}

const isInvisible = (code) =>
  (code < 32 && code !== 10) ||
  code === 127 ||
  (code >= 0x200b && code <= 0x200f) ||
  (code >= 0x202a && code <= 0x202e) ||
  (code >= 0x2066 && code <= 0x2069);

const stripInvisible = (text) =>
  [...text].filter((char) => !isInvisible(char.codePointAt(0))).join("");

export const cleanText = (value) =>
  stripInvisible(String(value ?? "").replace(/\r\n?/g, "\n"))
    .replace(/[ \t]+/g, " ")
    .trim();

export const sgPhone = z
  .string()
  .max(20)
  .transform((value, context) => {
    const phone = normalizeSgPhone(value);
    if (!phone) {
      context.addIssue({ code: "custom", message: SG_PHONE_MESSAGE });
      return z.NEVER;
    }
    return phone;
  });

export const optionalSgPhone = z
  .string()
  .max(20)
  .optional()
  .transform((value, context) => {
    if (!value || !value.trim()) return "";
    const phone = normalizeSgPhone(value);
    if (!phone) {
      context.addIssue({ code: "custom", message: SG_PHONE_MESSAGE });
      return z.NEVER;
    }
    return phone;
  });

export const email = z
  .string()
  .max(120)
  .transform((value) => value.trim().toLowerCase())
  .refine((value) => EMAIL.test(value) && !value.includes(".."), {
    message: "Enter a valid email address, like name@example.com.",
  });

export const personName = z
  .string()
  .max(120)
  .transform((value) => cleanText(value).replace(/\s+/g, " "))
  .refine((value) => value.length >= 2 && value.length <= 80, {
    message: "Enter your name (2 to 80 characters).",
  })
  .refine((value) => NAME.test(value), {
    message: "Names can use letters, spaces, apostrophes, dots and hyphens only.",
  });

export const newPassword = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use 128 characters or fewer.")
  .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), {
    message: "Use at least one letter and one number.",
  })
  .refine((value) => value.trim() === value, {
    message: "Passwords can't start or end with a space.",
  });

export function isRealDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const isoDate = z
  .string()
  .refine(isRealDate, { message: "Choose a real date." });

export const clockTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a time.");

export const freeText = (max) =>
  z
    .string()
    .max(max * 2)
    .transform(cleanText)
    .refine((value) => value.length <= max, {
      message: `Keep this under ${max} characters.`,
    });
