import { z } from "zod";

const optional = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  // "staging" relaxes one live-site rule: emails may come from Resend's test sender (onboarding@resend.dev)
  // while the restaurant's own domain isn't verified yet. Everything else stays as strict as live.
  APP_ENV: z.enum(["production", "staging"]).default("production"),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),
  CLIENT_IP_HEADER: optional.transform((value) => value?.toLowerCase()),
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is required. Paste your Neon connection string into backend/.env." })
    .startsWith("postgres", "DATABASE_URL must be a postgresql:// connection string")
    .refine(
      (value) => !/USER:PASSWORD|ep-xxxx/.test(value),
      "DATABASE_URL still has the example value. Paste your real Neon connection string into backend/.env.",
    ),
  DB_POOL_SIZE: z.coerce.number().int().positive().default(10),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173,http://localhost:4173"),
  MENU_CACHE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(300),
  SITE_URL: z.string().default("http://localhost:5173"),

  // Secrets: order/booking links, sign-in cookies, app tokens.
  ORDER_TOKEN_SECRET: z
    .string()
    .min(16)
    .default("dev-only-order-token-secret-change-me"),
  SESSION_SECRET: z
    .string()
    .min(16)
    .default("dev-only-session-secret-change-me"),
  JWT_SECRET: z
    .string()
    .min(32, "Use at least 32 characters")
    .default("dev-only-jwt-secret-change-me-before-launch"),
  // Owner account setup key: required on the live site to create the owner, remove it afterwards.
  ADMIN_SETUP_KEY: optional,
  SESSION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  STAFF_SESSION_HOURS: z.coerce.number().int().min(1).max(720).default(12),
  JWT_ACCESS_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(365).default(60),

  // Rewards Club: points per S$1 spent; POINTS_REDEEM_BLOCK points = POINTS_REDEEM_VALUE_CENTS off
  POINTS_PER_DOLLAR: z.coerce.number().int().min(0).default(1),
  POINTS_REDEEM_BLOCK: z.coerce.number().int().min(1).default(100),
  POINTS_REDEEM_VALUE_CENTS: z.coerce.number().int().min(1).default(500),

  // Pickup ordering (Singapore time)
  KITCHEN_OPEN: z.string().regex(/^\d{2}:\d{2}$/).default("11:30"),
  KITCHEN_CLOSE: z.string().regex(/^\d{2}:\d{2}$/).default("22:30"),
  PICKUP_PREP_MINUTES: z.coerce.number().int().min(0).default(30),
  PICKUP_SLOT_MINUTES: z.coerce.number().int().min(5).default(15),
  PICKUP_DAYS_AHEAD: z.coerce.number().int().min(1).max(14).default(7),
  PENDING_ORDER_EXPIRY_MINUTES: z.coerce.number().int().min(15).default(120),

  // Table bookings (Singapore time)
  TOTAL_TABLES: z.coerce.number().int().min(1).max(200).default(20),
  BOOKING_FIRST: z.string().regex(/^\d{2}:\d{2}$/).default("11:30"),
  BOOKING_LAST: z.string().regex(/^\d{2}:\d{2}$/).default("22:00"), // last table booking time
  BOOKING_STEP_MINUTES: z.coerce.number().int().min(15).max(60).default(30),
  BOOKING_MINUTES: z.coerce.number().int().min(30).max(300).default(120),
  BOOKING_LEAD_MINUTES: z.coerce.number().int().min(0).default(60),
  RESERVATION_DAYS_AHEAD: z.coerce.number().int().min(1).max(180).default(60),
  RESERVATION_MAX_ACTIVE: z.coerce.number().int().min(1).max(20).default(3),
  MAX_PARTY_SIZE: z.coerce.number().int().min(2).max(100).default(45),

  PAYMENT_PROVIDER: z.enum(["test", "stripe"]).default("test"),
  STRIPE_SECRET_KEY: optional,
  STRIPE_WEBHOOK_SECRET: optional,
  STRIPE_API_URL: z.string().url().default("https://api.stripe.com/v1"),

  EMAIL_PROVIDER: z.enum(["file", "resend"]).default("file"),
  RESEND_API_KEY: optional,
  EMAIL_FROM: z.string().default("BrewGrillz <onboarding@resend.dev>"),
  EMAIL_REPLY_TO: optional,
  RESTAURANT_EMAIL: z.string().default("info@brewgrillz.sg"),

  // off = no WhatsApp, file = save messages in backend/tmp/whatsapp, meta = send for real
  WHATSAPP_PROVIDER: z.enum(["off", "file", "meta"]).default("off"),
  WHATSAPP_TOKEN: optional,
  WHATSAPP_PHONE_NUMBER_ID: optional,
  WHATSAPP_API_VERSION: z.string().default("v23.0"),
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().default("en"),

  SENTRY_DSN: optional,
  SENTRY_ENVIRONMENT: optional,
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment variables:",
    z.flattenError(parsed.error).fieldErrors,
  );
  process.exit(1);
}

const data = parsed.data;
const missing = [];
const live = data.NODE_ENV === "production";

if (data.PAYMENT_PROVIDER === "stripe" && !data.STRIPE_SECRET_KEY)
  missing.push("STRIPE_SECRET_KEY");
if (data.EMAIL_PROVIDER === "resend" && !data.RESEND_API_KEY)
  missing.push("RESEND_API_KEY");
if (data.WHATSAPP_PROVIDER === "meta")
  for (const name of ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"])
    if (!data[name]) missing.push(name);
if (
  data.JWT_SECRET === data.SESSION_SECRET ||
  data.JWT_SECRET === data.ORDER_TOKEN_SECRET
)
  missing.push(
    "a JWT_SECRET of its own (it must differ from SESSION_SECRET and ORDER_TOKEN_SECRET)",
  );

if (live) {
  if (data.PAYMENT_PROVIDER === "test")
    missing.push("PAYMENT_PROVIDER=stripe (test mode is not allowed in production)");
  for (const name of ["ORDER_TOKEN_SECRET", "SESSION_SECRET", "JWT_SECRET"])
    if (data[name].startsWith("dev-only")) missing.push(name);
  for (const name of ["SESSION_SECRET", "ORDER_TOKEN_SECRET", "ADMIN_SETUP_KEY"])
    if (data[name] && data[name].length < 32)
      missing.push(`${name} with at least 32 characters`);
  if (data.SESSION_SECRET === data.ORDER_TOKEN_SECRET)
    missing.push("an ORDER_TOKEN_SECRET of its own (it must differ from SESSION_SECRET)");
  if (data.EMAIL_PROVIDER !== "resend")
    missing.push("EMAIL_PROVIDER=resend (file mode would not send any emails in production)");
  if (/onboarding@resend\.dev/i.test(data.EMAIL_FROM) && data.APP_ENV !== "staging")
    missing.push("EMAIL_FROM on your own domain, like BrewGrillz <info@brewgrillz.sg>");
  if (!data.SITE_URL.startsWith("https://"))
    missing.push("SITE_URL starting with https://");
  if (/localhost|127\.0\.0\.1/.test(data.CORS_ORIGINS))
    missing.push("CORS_ORIGINS with only your live site addresses (no localhost)");
  if (!data.STRIPE_API_URL.startsWith("https://api.stripe.com/"))
    missing.push("STRIPE_API_URL left at its default (https://api.stripe.com/v1)");
  if (data.PAYMENT_PROVIDER === "stripe" && !data.STRIPE_WEBHOOK_SECRET)
    missing.push("STRIPE_WEBHOOK_SECRET");
}

if (missing.length) {
  console.error(`Missing configuration: ${missing.join(", ")}.`);
  process.exit(1);
}

export const env = {
  ...data,
  isProduction: live,
  corsOrigins: data.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
