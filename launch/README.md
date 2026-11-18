# Going live

Step-by-step, in order. Do **staging** first (a test copy of the site online), test it, then do the **live** site the same way with the client's real keys.

The website goes on **Vercel**, the backend on **Render**, the database on **Neon**, emails through **Resend** and payments through **Stripe**. Pushing to GitHub updates both Vercel and Render automatically.

## 1. Accounts you need

| Service | Staging | Live |
| --- | --- | --- |
| GitHub | your repo | same repo |
| Neon | a new project `brewgrillz-staging` | a new project `brewgrillz` (client's account) |
| Render | your account | client's account |
| Vercel | your account | client's account |
| Stripe | free account, **test** keys (`sk_test_`) | client's account, **live** keys (`sk_live_`) |
| Resend | free account, verify the domain | client's account, verify brewgrillz.sg |

## 2. Make the settings files (on your Mac)

```bash
cd ~/Downloads/B/brewgrillz
node launch/prepare.mjs brewgrillz.sg
```

This creates `launch/filled/render.env` and `launch/filled/vercel.env` with strong secrets already filled in. Git ignores this folder: never send or commit it.

Open `launch/filled/render.env` and replace every `PASTE_...`:
- `DATABASE_URL`: Neon → Connect → copy the connection string. Keep `?sslmode=require`, delete `&channel_binding=require`.
- `STRIPE_SECRET_KEY`: Stripe → Developers → API keys.
- `STRIPE_WEBHOOK_SECRET`: comes in step 5. Leave the placeholder for now if you like, then come back.
- `RESEND_API_KEY`: Resend → API keys.

On staging, change the addresses in both files to your staging links (for example `SITE_URL=https://brewgrillz-staging.vercel.app` and the same in `CORS_ORIGINS` and `VITE_SITE_URL`).

Then check everything:

```bash
node launch/check.mjs
```

It lists anything missing or wrong, and when all is good it prints exactly what to paste where.

## 3. Render (backend)

1. Render → New → Blueprint → pick the GitHub repo. It reads `render.yaml` (root folder `backend`, health check `/api/ping`).
2. Service → Environment → Add from .env → paste all of `launch/filled/render.env` → Save.
3. Wait for the deploy. The database tables and the menu are created automatically on start.
4. Open `https://<your-render-url>/api/health`: it should say `"ok"`.

## 4. Vercel (website)

1. Vercel → Add New → Project → pick the repo → Root Directory: `frontend`.
2. Settings → Environment Variables → paste all of `launch/filled/vercel.env` (Production).
3. In `frontend/vercel.json`, the first rewrite must point at your Render address (`https://brewgrillz-api.onrender.com/api/:path*` now). Change it if your Render name is different, commit and push.
4. Deploy. The build stops on purpose if it can't reach the API (so the menu page is never published empty).

## 5. Stripe webhook

Stripe → Developers → Webhooks → Add endpoint:
- URL: `https://<your-render-url>/api/webhooks/stripe` (live: `https://api.brewgrillz.sg/api/webhooks/stripe`)
- Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`

Copy the signing secret (`whsec_...`) into Render → Environment → `STRIPE_WEBHOOK_SECRET` → Save.

## 6. Owner account (once)

Open `https://<site>/admin/login`. It shows "Set up the owner" and asks for the **setup key**: that's `ADMIN_SETUP_KEY` in `launch/filled/render.env` (`node launch/check.mjs` also prints it). After this the form never appears again. Add the team in Dashboard → Team.

## 7. Test (staging checklist)

- [ ] Order as a guest: menu → cart → checkout → Stripe test card `4242 4242 4242 4242` → order page → receipt email
- [ ] Staff: the order appears with a sound → Start preparing → Ready → Picked up; customer gets emails
- [ ] Refund in the dashboard → Stripe shows the refund → refund email
- [ ] Book a table → confirm it in the dashboard → confirmation email; cancel from the booking page
- [ ] Event enquiry → appears in Dashboard → Events
- [ ] Sign up → points after an order → staff add a dine-in bill → spend 100 points at checkout
- [ ] Forgot password email works
- [ ] Mark a dish sold out → it can't be ordered → switch it back
- [ ] Pause online orders → checkout shows the message → turn back on
- [ ] Phone and laptop, Chrome and Safari
- [ ] `cd qa && QA_SITE=https://<staging-site> npm run e2e` (optional, browser tests against staging)
- [ ] `cd perf && SITE=https://<staging-site> npm run lighthouse`

## 8. Live

Before: the client's photos, GrabFood and foodpanda links, number of tables (`TOTAL_TABLES`), privacy and terms approved, opening hours and contact details confirmed.

1. Run steps 2 to 6 again with the live keys (Stripe `sk_live_`, the client's Neon, Render and Vercel).
2. Domain (where brewgrillz.sg is managed):
   - `www.brewgrillz.sg` → CNAME to Vercel (Vercel shows the exact value under Domains)
   - `brewgrillz.sg` → Vercel's A record, set to redirect to www
   - `api.brewgrillz.sg` → CNAME to the Render address (Render → Settings → Custom domain)
   - Resend's DKIM, SPF and MX records for sending emails
3. Check it all at once:

```bash
bash launch/health.sh brewgrillz.sg
```

4. Place one real order with a real card, then refund it from the dashboard.

## 9. After going live

- Google Search Console: add the site, submit `https://www.brewgrillz.sg/sitemap.xml`
- Google Business Profile: website link, menu link `/menu`, booking link `/reserve`, order link `/menu`
- Uptime monitor on `https://api.brewgrillz.sg/api/ping` (free: UptimeRobot or HetrixTools)
- Two-step sign-in on GitHub, Vercel, Render, Neon, Stripe and Resend
- Neon: check the restore window (point-in-time recovery)
- WhatsApp (optional): `node launch/whatsapp-templates.mjs` prints the 8 templates to create in Meta. When approved, set `WHATSAPP_PROVIDER=meta`, `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` in Render.

## Files here

| File | What it does |
| --- | --- |
| `prepare.mjs` | Makes `filled/render.env` and `filled/vercel.env` with fresh secrets |
| `check.mjs` | Checks the filled files and prints what to paste where |
| `health.sh` | After the domain is pointed: DNS, website, API, database, SSL and email records |
| `whatsapp-templates.mjs` | Prints the WhatsApp templates for Meta |
| `render.env.template`, `vercel.env.template` | The templates `prepare.mjs` fills in |
