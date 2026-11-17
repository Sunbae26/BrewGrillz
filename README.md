# BrewGrillz — brewgrillz.sg

Grill & craft bar website for BrewGrillz, 163 Rochor Road, Bugis.
Stack: **React + Vite** (client) · **Node + Express + Prisma** (server) · Neon Postgres · Stripe · Resend · Vercel + Render.

Design concept: **"Neon Saloon"** — brand red + charcoal from the logo, a western slab voice (wanted posters, Rye type),
neon-bar pops (hop lime), film grain, a simple video hero and **MoCo** (motion-control camera) transitions.

---

## Run it locally (VS Code)

Needs **Node 20+** (22 recommended).

```bash
cd brewgrillz
npm run install:all          # installs root + client + server (also runs `prisma generate`)
cp server/.env.example server/.env
npm run dev                  # web → http://localhost:5173   api → http://localhost:4000
```

- Front end only: `npm run dev:web`
- API health check: http://localhost:4000/api/health
- Style guide (Sprint 0): http://localhost:5173/styleguide

The site runs fine **without** a database. The newsletter form politely says "not available yet" until `DATABASE_URL` is set.

### Connect the database (when ready)
1. Create a Neon project (region: Singapore) and copy the **pooled** and **direct** connection strings into `server/.env`
   as `DATABASE_URL` and `DIRECT_URL`.
2. `cd server && npx prisma migrate dev --name init && npm run db:seed`  (seeds settings + the full menu)

### The menu
- **One file:** `client/src/data/menu.json` (from the Jan 2026 dining menu). The Menu page, the database seed and the
  `/api/menu` fallback all read it. Change a price there, then re-run `npm run db:seed`.
- `GET /api/menu` returns the menu from the database (or from `menu.json` if no database is set yet).
- Deep links: `/menu#grill`, `#pizza`, `#pasta`, `#burgers`, `#bites`, `#platters`, `#beer`, `#cocktails`, `#wine`…
- Table QR codes: point them at `/menu?table=1` (view-only, no order buttons).

---

## Production build (what customers get)

```bash
npm --prefix client run build     # builds + pre-renders every page to real HTML (fast first paint, good for Google)
npm --prefix client run preview   # http://localhost:4173 — test speed here, not in dev mode
```

Speed (measured on the production build): desktop Lighthouse 100 · mobile 82 (Lighthouse's slow-4G test) ·
real throttled phone test: first paint ~1.2 s.

## Project structure

```
client/
  public/brand/           logos (transparent cut from the Drive files), favicon
  public/images/food/     client photos → WebP (1800w + 900w "-sm")
  src/motion/             gsap setup + MoCo eases, smooth scroll (off by default), MoCo transitions, reveal hooks
  src/components/         Navbar, Footer, Marquee, Cursor, ui (Button, Sticker…)
  public/media/           hero.mp4 goes here
  src/sections/home/      Hero, MainEvent (pinned fly-through), PickYourFire, Platters, BarTeaser, Vibes, Extras
  src/pages/              Home, Styleguide, Placeholder (pages for later sprints + 404)
  src/data/               site.js (contact/hours/socials), home.js (dishes, prices, taps, cocktails)
  src/styles/             tokens.css (design tokens), base, components, home, pages
server/
  prisma/schema.prisma    full data model stubbed for all sprints
  src/app.js              express app (helmet, cors, rate limit), routes mounted per sprint
  src/routes/             health, newsletter
render.yaml               Render blueprint (API)
client/vercel.json        Vercel rewrites (/api → Render, SPA fallback) + caching
```

## MoCo motion — how to use

```jsx
import MoCoLink from './motion/MoCoLink'

<MoCoLink to="/menu">Menu</MoCoLink>                                   // whip-pan transition
<MoCoLink to="/menu" push><img data-push src="…" /></MoCoLink>         // camera push-in from the photo
<Button to="/order">Order</Button>                                      // punch-in click + whip-pan
```

Scroll effects: add `data-split` (headline char reveal), `data-reveal` / `data-reveal="whip"` / `data-parallax="0.2"`
to any element inside a section that calls `useReveals(ref)`.

Everything respects **prefers-reduced-motion** and runs lighter on phones.

## Swapping in real media
- **Hero video:** put a muted loop at `client/public/media/hero.mp4` (10–20s, 1080p, under ~6 MB).
  Until the file exists the hero shows the poster photo (`heroPoster` in `src/data/site.js`).
- **Photos:** export to WebP at 1800px and 900px (`name.webp`, `name-sm.webp`) into `public/images/food/`.

## Online ordering (pickup only)
- **Rules** live in `client/src/data/ordering.js` and are shared by the site and the server:
  kitchen hours 11:30–22:30 (Singapore time), 15-minute slots, 30 minutes' notice, up to 6 days ahead.
  Add public holidays or closures to `closedDates` (`'2026-12-25'`).
- **Alcohol is dine-in only.** Only soft drinks/mocktails and coffee/tea can be ordered online
  (`orderableDrinkCategories`). The server refuses anything else, whatever the browser sends.
- **Prices** are always recalculated on the server from `menu.json`; the cart total is for display.
- **Delivery** goes through GrabFood and foodpanda — set the real store links in `site.js` → `delivery`.
- **Tracking:** after paying, the customer lands on `/track/<token>` (also in their email and WhatsApp).
  Orders placed in this browser are listed at `/track`.

### Test it locally without Stripe
In `server/.env` set `DEV_FAKE_PAYMENTS=true` and leave `STRIPE_SECRET_KEY` empty.
Checkout then marks the order paid straight away and sends you to the tracking page.
Orders are saved to `server/.dev-data/orders.json` when there's no `DATABASE_URL`.

Move an order along (staff screens arrive in Sprint 5 — until then use the API):
```bash
KEY=change-me-staff-key   # STAFF_API_KEY from server/.env
curl -s localhost:4000/api/staff/orders -H "x-staff-key: $KEY"
curl -s -X POST localhost:4000/api/staff/orders/<id>/status -H "x-staff-key: $KEY" -H "content-type: application/json" -d '{"status":"ACCEPTED"}'
# then PREPARING → READY → COMPLETED
curl -s -X POST localhost:4000/api/staff/orders/<id>/refund -H "x-staff-key: $KEY" -H "content-type: application/json" -d '{}'          # full refund
curl -s -X POST localhost:4000/api/staff/orders/<id>/refund -H "x-staff-key: $KEY" -H "content-type: application/json" -d '{"amountCents":500}'  # partial
```

### Stripe (when keys are ready)
1. Put `STRIPE_SECRET_KEY` (test key first) in `server/.env` and set `DEV_FAKE_PAYMENTS=false`.
2. Webhooks locally: `stripe listen --forward-to localhost:4000/api/webhooks/stripe` and copy the
   `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET`.
3. In production add a webhook in the Stripe dashboard pointing to
   `https://<api-domain>/api/webhooks/stripe` with these events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`.
4. Turn on PayNow, Apple Pay and Google Pay under Settings → Payment methods (Checkout shows them automatically).

### Email and WhatsApp
- Email (Resend): `RESEND_API_KEY`, `MAIL_FROM`, `RESTAURANT_EMAIL`. Without a key, emails are printed in the server log.
- WhatsApp (Meta Cloud API): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`. Create and get approval for these templates
  (language `en`): `bgz_order_received` (name, order no., pickup time, link), `bgz_order_ready` (name, order no.),
  `bgz_order_refunded` (name, order no., amount). Without a token, messages are printed in the server log.

## Sprint status
- ✅ Sprint 0 — repo, server, schema, deploy configs, design system, MoCo motion library, `/styleguide`
- ✅ Sprint 1 — home page
- ✅ Sprint 2 — menu page, menu data, seed + `/api/menu`, print menu, table-QR mode
- ✅ Sprint 3 — cart, pickup checkout, Stripe payments, email/WhatsApp notifications, order tracking
- ⏭ Sprint 4 — reservations and remaining pages
