import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate.js";
import { limiter } from "../../utils/rate-limit.js";
import {
  email,
  newPassword,
  optionalSgPhone,
  personName,
} from "../../utils/validation.js";
import { requireUser } from "../../middleware/auth.js";
import { clearSessionCookie, setSessionCookie } from "../../utils/session.js";
import {
  login,
  publicUser,
  register,
  requestPasswordReset,
  resetPassword,
} from "./auth.service.js";
import { createOwner, setupStatus } from "./setup.service.js";
import {
  deviceName,
  issueTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  signOutEverywhere,
  wantsAppTokens,
} from "./tokens.service.js";

const password = newPassword;
const phone = optionalSgPhone;
const refreshToken = z.string().trim().min(40).max(200);

const WINDOW = 15 * 60_000;
const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";
const emailKey = (req) =>
  String(req.body?.email ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 120);

const strictLimit = limiter({ windowMs: WINDOW, limit: 30, message: TOO_MANY });
const loginLimit = limiter({
  windowMs: WINDOW,
  limit: 10,
  message: TOO_MANY,
  key: emailKey,
});
const loginNetworkLimit = limiter({
  windowMs: WINDOW,
  limit: 150,
  message: TOO_MANY,
});
const refreshLimit = limiter({
  windowMs: WINDOW,
  limit: 120,
  message: TOO_MANY,
});

const noStore = (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
};

async function sendAuth(req, res, user, status = 200) {
  const body = { data: await publicUser(user) };
  if (wantsAppTokens(req) || req.authMethod === "token")
    body.tokens = await issueTokens(user, { device: deviceName(req) });
  else setSessionCookie(res, user);
  res.status(status).json(body);
}

export const tokenRouter = Router();

tokenRouter.use(noStore);

tokenRouter.post(
  "/refresh",
  refreshLimit,
  validate(z.object({ refreshToken }), "body"),
  async (req, res) => {
    const { user, tokens } = await rotateRefreshToken(
      req.valid.body.refreshToken,
      deviceName(req),
    );
    res.json({ data: await publicUser(user), tokens });
  },
);

tokenRouter.post(
  "/revoke",
  refreshLimit,
  validate(z.object({ refreshToken }), "body"),
  async (req, res) => {
    await revokeRefreshToken(req.valid.body.refreshToken);
    res.json({ data: null });
  },
);

export const authRouter = Router();

authRouter.use(noStore);

authRouter.get("/me", async (req, res) => {
  res.json({ data: await publicUser(req.user) });
});

authRouter.post(
  "/register",
  strictLimit,
  validate(
    z.object({
      name: personName,
      email,
      phone,
      password,
      whatsapp: z.boolean().default(false),
    }),
    "body",
  ),
  async (req, res) => {
    await sendAuth(req, res, await register(req.valid.body), 201);
  },
);

authRouter.post(
  "/login",
  loginNetworkLimit,
  loginLimit,
  validate(z.object({ email, password: z.string().min(1).max(128) }), "body"),
  async (req, res) => {
    await sendAuth(req, res, await login(req.valid.body));
  },
);

authRouter.post(
  "/logout",
  validate(
    z.object({ refreshToken: refreshToken.optional() }).default({}),
    "body",
  ),
  async (req, res) => {
    if (req.valid.body.refreshToken)
      await revokeRefreshToken(req.valid.body.refreshToken);
    clearSessionCookie(res);
    res.json({ data: null });
  },
);

authRouter.post("/logout-all", strictLimit, requireUser, async (req, res) => {
  await sendAuth(req, res, await signOutEverywhere(req.user.id));
});

authRouter.post(
  "/forgot-password",
  strictLimit,
  validate(
    z.object({ email }),
    "body",
  ),
  async (req, res) => {
    await requestPasswordReset(req.valid.body.email);
    res.json({ data: { sent: true } });
  },
);

authRouter.post(
  "/reset-password",
  strictLimit,
  validate(z.object({ token: z.string().min(20).max(100), password }), "body"),
  async (req, res) => {
    await sendAuth(req, res, await resetPassword(req.valid.body));
  },
);

authRouter.get("/setup", async (req, res) => {
  res.json({ data: await setupStatus() });
});

authRouter.post(
  "/setup",
  strictLimit,
  validate(
    z.object({
      name: personName,
      email,
      password,
      setupKey: z.string().max(200).optional(),
    }),
    "body",
  ),
  async (req, res) => {
    await sendAuth(req, res, await createOwner(req.valid.body), 201);
  },
);
