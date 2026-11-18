# BrewGrillz

Full-stack website for BrewGrillz, Finest Grill Dining & Bar, 163 Rochor Road, Bugis, Singapore.

| App | Stack |
| --- | --- |
| `frontend` | React 19, React Router 7 (pre-rendered pages), Vite, Tailwind CSS 4, TanStack Query, GSAP |
| `backend` | Node.js 22, Express 5, Prisma 7, PostgreSQL (Neon) |
| `qa` | API tests (more tests, speed and load testing in Sprint 6) |

## Requirements

- Node.js 22.12 or newer (`.nvmrc`)
- A PostgreSQL database (Neon free tier recommended)

## 1. Database (Neon)

1. Go to https://neon.tech and create a free account.
2. **New project**: name `brewgrillz`, Postgres 16 or newer, region **AWS Asia Pacific (Singapore)**.
3. Open the project → **Connect** → copy the connection string (it starts with `postgresql://` and ends with `?sslmode=require`).
4. In `backend`, copy `.env.example` to `.env` and paste it into `DATABASE_URL`.

Use a separate Neon project for BrewGrillz. Never point it at another restaurant's database.

## 2. Run it

Backend, in one terminal:

```bash
cd backend
npm install
npm run dev
```

Frontend, in a second terminal:

```bash
cd frontend
cp .env.example .env   # first time only
npm install
npm run dev
```

Site: http://localhost:5173. API: http://localhost:4000/api/ping.

`npm run dev` in the backend creates and updates the database tables and loads the menu automatically if it changed. You never need to run migrate or seed commands by hand. To reload the menu from scratch, run `npm run db:seed:force`. To look at the data, run `npm run db:studio`.

When updating from a new zip, keep your two `.env` files and the `backend/prisma/migrations` folder.

## Menu data

The whole menu (16 sections, dishes and drinks) lives in `backend/prisma/data/menu.js`. When you change it, `npm run dev` in the backend notices and updates the database. Dishes removed from the file are hidden on the site, not deleted, so past orders stay intact. Prices and sold-out switches that staff change from the dashboard (Sprint 5) are kept, unless you run `npm run db:seed:force`.

The website gets the menu from the API (`GET /api/menu`). The build pre-renders the menu page with the dishes from the API, so it shows instantly and Google can read it; in the browser it then refreshes every minute, so price changes and sold-out dishes show up without a rebuild.

Dish photos are in `frontend/public/images/food/` as `<name>.webp`, `<name>-sm.webp` and `<name>-xs.webp`; the `image` field in `menu.js` is the name.

## Online ordering (pickup only)

- **Pickup only.** Delivery goes through GrabFood and foodpanda (links in `frontend/app/config/site.js` → `delivery`).
- **Alcohol is dine-in only.** Beer, cocktails, wine and spirits show "Dine-in only" and the server refuses them. Soft drinks, mocktails and coffee can be ordered (`orderable` in `menu.js`).
- **Pickup times:** kitchen hours 11:30 AM to 10:30 PM (Singapore time), every 15 minutes, starting 30 minutes from now, for the next 7 days. Set in `backend/.env` (`KITCHEN_OPEN`, `KITCHEN_CLOSE`, `PICKUP_*`). Closed days and a limit per time slot are settings (`PATCH /api/staff/settings` now, the dashboard in Sprint 5).
- **Prices** are always calculated again on the server from the database. The cart total is for display only.
- **Guests** check out with name, Singapore mobile, email and an optional WhatsApp opt-in. Order numbers look like `BG-261117-AB2C`.
- **Order page:** `/order/BG-…?t=…` is a private link (in the email and WhatsApp) that updates by itself: Order received → On the grill → Ready for pickup → Collected. `/track` lists orders placed on this device and finds any order by its number and email.

### Payments

Set `PAYMENT_PROVIDER` in `backend/.env`:

| Value | What happens |
| --- | --- |
| `test` | Default. The Pay button succeeds straight away. Not allowed in production. |
| `stripe` | Stripe Checkout with card (including Apple Pay and Google Pay) and PayNow. Set `STRIPE_SECRET_KEY`. |

Webhooks confirm payments even if the customer closes the browser. Point Stripe at `https://YOUR-API-DOMAIN/api/webhooks/stripe` with the events `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `charge.refunded`, and set `STRIPE_WEBHOOK_SECRET`. Locally: `stripe listen --forward-to localhost:4000/api/webhooks/stripe`.

### Payment safety (same as Ruchi)

- **Pressing Pay twice** never creates two orders (each attempt has an idempotency key), and reuses the open Stripe page.
- **Deadline:** an unpaid order holds its pickup slot until 2 hours after it was placed (`PENDING_ORDER_EXPIRY_MINUTES`) or its pickup time, whichever comes first. Every 5 minutes the API releases unpaid orders past their deadline, after asking Stripe whether they were paid after all.
- **No webhook needed to confirm:** after paying, the order page asks the API to check with Stripe every few seconds.
- **Cancelled on Stripe and came back:** the old unpaid order is closed when the new one is placed; if the old one was paid after all, the customer is taken to it instead of paying twice.
- **Amount check:** a payment that doesn't match the order total is not marked paid.
- **Staff alerts** (email to `RESTAURANT_EMAIL`, subject starting `[BrewGrillz alert]`): payment for a cancelled order, paid twice, paid after the pickup time, a payment that matches no order, wrong amount, refunded while still open.

### Emails and WhatsApp

| Setting | Values |
| --- | --- |
| `EMAIL_PROVIDER` | `file` (default: emails saved in `backend/tmp/emails/`, open them in a browser) or `resend` (`RESEND_API_KEY`, `EMAIL_FROM`, `RESTAURANT_EMAIL`) |
| `WHATSAPP_PROVIDER` | `off`, `file` (messages saved in `backend/tmp/whatsapp/`) or `meta` (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`) |

Customers get an email when the order is confirmed, on the grill, ready, cancelled and refunded; the restaurant gets a new-order email. If Resend fails, the order still succeeds and the email is retried from the database queue (1, 5, 15, 30, 60 and 120 minutes). Check your Resend setup with `npm run email:test` in `backend`.

WhatsApp messages go only to customers who ticked the opt-in. Create these templates in Meta (category Utility, English) with exactly the wording in `backend/src/modules/whatsapp/templates.js`: `bgz_order_placed`, `bgz_order_preparing`, `bgz_order_ready`, `bgz_order_cancelled`, `bgz_booking_received`, `bgz_booking_confirmed`, `bgz_booking_declined`, `bgz_booking_cancelled`.

## Accounts, Rewards Club and the staff dashboard

Same sign-in system as Ruchi.

### Customers

- `/register`, `/login`, `/forgot-password` (reset link by email, valid 60 minutes) and `/account` (orders, table bookings, points, profile).
- Guests can still order and book without an account. Guests track an order at `/track`.
- Sign-in uses a secure `httpOnly` cookie (`brewgrillz_session`, 30 days for customers, 12 hours for staff). Changing the password or "Sign out other devices" ends every other session.
- A future phone app can use JWT access tokens (15 minutes) with rotating refresh tokens at `/api/auth/token/*`.

### Rewards points

- 1 point for every S$1 paid online, added when the order is paid. 100 points = S$5 off, used at checkout in blocks of 100 (at least S$0.50 is always paid online).
- Dine-in: staff find the member in **Dashboard → Rewards** and enter the bill total.
- Cancelled or fully refunded orders take back their points and return any points spent.
- Change the numbers with `POINTS_PER_DOLLAR`, `POINTS_REDEEM_BLOCK` and `POINTS_REDEEM_VALUE_CENTS`.

### Owner and staff

1. **Owner (once):** open `/admin/login`. The first time, it shows "Set up the owner". The account created there is the owner, and the form never appears again.
   - Local and staging: no key needed.
   - Live (`NODE_ENV=production`): set `ADMIN_SETUP_KEY` in Render first (generate one with `openssl rand -hex 24`). The form then asks for that key.
   - Or from the terminal: `cd backend && npm run admin:create -- owner@email.com "Owner Name" "strong-password"`
2. **Team:** the owner (or an admin) adds people in **Dashboard → Team**. Only the owner can add or change admins.

| Can do | Staff | Admin | Owner |
| --- | --- | --- | --- |
| Orders board (new → preparing → ready → picked up), cancel | ✓ | ✓ | ✓ |
| Bookings (confirm, decline, arrived, no-show), event enquiries | ✓ | ✓ | ✓ |
| Mark dishes sold out, pause online orders | ✓ | ✓ | ✓ |
| Add Rewards points for a dine-in bill | ✓ | ✓ | ✓ |
| Change prices, refunds, slot limit, closed days, reports, correct points | | ✓ | ✓ |
| Add staff | | ✓ | ✓ |
| Add or change admins | | | ✓ |

The dashboard is at `/admin`. New orders play a chime and the tabs show live counts.

## Table bookings

Customers book at `/reserve` ("Book a Table"): a day from the date ribbon (next 60 days), party size (1 to 10; bigger groups go to Events) and an arrival time every 30 minutes from 11:30 AM to 9:30 PM. Guests book with name, mobile and email. Bookings made while signed in also show in the account.

- **No overbooking:** every request holds a table straight away for 2 hours (`BOOKING_MINUTES`). A time shows **Full** once all `TOTAL_TABLES` (default 20) are held. Two people can't take the last table at once.
- **Limits per guest** (by mobile or email): one booking per day and `RESERVATION_MAX_ACTIVE` (default 3) upcoming bookings.
- **Status page** `/reserve/BT-…?t=…` (private link, also in the email): a place card with a stamp that changes from Requested to Confirmed by itself, Add to calendar, Directions, and Cancel booking.
- **Emails** when the request arrives (customer and restaurant), when it's confirmed, declined or cancelled. WhatsApp too if the guest opted in.
- Requests nobody answered by their arrival time are closed automatically (as Not available), so they stop holding a table.
- Closed days (settings) show as Closed in the date ribbon.

All settings are in `backend/.env` (`TOTAL_TABLES`, `BOOKING_*`, `RESERVATION_*`, `MAX_PARTY_SIZE`).

## Events and parties

`/events` shows what BrewGrillz hosts, how it works, and an enquiry form: occasion, date (at least 24 hours ahead), start time, guests (8 to 150), private hire, budget and a message. The customer and `RESTAURANT_EMAIL` get an email with the reference (`EV-…`). Nothing is booked or charged until the team sends a quote and the customer accepts it. One email address can send 3 enquiries a day.

## Other pages

- `/bar`: the three Brewerkz house taps, then every alcoholic drink from the menu (from the API), marked dine-in only.
- `/our-place`: the story, a photo gallery, FAQ and the map. Swap in interior photos when the client sends them.
- `/privacy` and `/terms`: wording in `frontend/app/config/legal.js` (change it there and update `LEGAL_UPDATED`). **The client (or their lawyer) must confirm before launch:** the Data Protection Officer contact, the pickup refund rules, the 15-minute table hold and 2-hour seating, and how long data is kept. These pages are a careful starting draft, not legal advice.
- `/track` (Track your order): order number + email, plus "On this device" orders, like Ruchi.

## Security

- **Settings check on start** (`backend/src/config/env.js`): in production the API refuses to start with test payments, file emails, missing or reused secrets, an `http://` site address or localhost in `CORS_ORIGINS`, and lists what to fix.
- **Request checks:** every body, query and URL value is validated with zod (names, Singapore mobile numbers, emails, quantities, hidden characters stripped); bodies are limited to 100 KB.
- **Rate limits** per visitor: 1,200 API calls a minute overall, 20 orders a minute, 10 order look-ups per 15 minutes, 10 table bookings and 5 event enquiries an hour, 10 newsletter sign-ups an hour.
- **Headers:** Helmet on the API; HSTS, CSP, frame and permission rules on the website (`frontend/vercel.json`).
- **Order and booking links** carry an HMAC token, so order numbers can't be guessed into someone else's order; the public order page shows no email or phone number.
- **Webhooks** are accepted only with a valid Stripe signature from the last 5 minutes.
- **Errors** never show internal details to customers; each failed request has a request id in the log.
- **Secrets** go only into the Render and Vercel dashboards, never into Git or any `VITE_` variable.

## Production build

```bash
cd frontend && npm run build && npm run preview
cd backend && npm run build && npm run db:deploy
```

`npm run preview` serves the built site like production hosting (`/menu` serves the pre-rendered page, order pages fall back to the app shell, unknown addresses get the 404 page). Always test with this, not `vite preview`.

## Deployment (not yet: after the whole site is built and tested)

Same setup as Ruchi, all in Singapore: Vercel for the website (root directory `frontend`, output `build/client`), Render for the API (root directory `backend`, see `render.yaml`, health check `/api/ping`, one always-on instance), Neon for the database, Cloudflare in front. The full go-live checklist arrives with Sprint 6.

On Vercel set `VITE_API_URL=/api` (proxied by `vercel.json`, update the destination to your Render address), `BUILD_API_URL` to the API's full address, and `VITE_SITE_URL`. On Vercel production builds the build stops if the menu can't be loaded from the API, so an empty menu page is never published.

## Checks on every push

`.github/workflows/ci.yml` runs on every push to `main`: clean installs, lint, database migrations and menu on a throwaway PostgreSQL, a strict frontend build (the menu page must pre-render with dishes) and the API tests in `qa/api`, including Stripe payments against a fake Stripe.

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/ping` | Health check without the database (Render, uptime monitors) |
| GET | `/api/health` | Health and database check (manual checks only) |
| GET | `/api/info` | Restaurant details and ordering rules |
| GET | `/api/menu` | The whole menu (dishes and drinks) |
| GET | `/api/menu/items/:slug` | One dish |
| GET | `/api/menu/availability?items=a,b` | Sold-out check for the cart |
| GET | `/api/orders/pickup-slots` | Pickup days and times |
| POST | `/api/orders` | Place a pickup order |
| GET | `/api/orders/:code?t=` | Order status (private link) |
| POST | `/api/orders/:code/check?t=` | Ask Stripe whether the order is paid |
| POST | `/api/orders/:code/confirm?t=` | Confirm a test-mode payment |
| POST | `/api/orders/find` | Order link from order number + email |
| GET | `/api/reservations/days` | Bookable days (closed days marked) |
| GET | `/api/reservations/availability?date=` | Arrival times for a day, available or full |
| POST | `/api/reservations` | Request a table |
| GET | `/api/reservations/:code?t=` | Booking status (private link) |
| POST | `/api/reservations/:code/cancel?t=` | Guest cancels their booking |
| GET | `/api/enquiries/rules` | Occasions, notice and guest limits |
| POST | `/api/enquiries` | Event or party enquiry |
| POST | `/api/newsletter` | Newsletter sign-up |
| POST | `/api/webhooks/stripe` | Stripe webhook |
| GET | `/api/auth/me` | Signed-in user (or null) |
| POST | `/api/auth/register`, `/login`, `/logout`, `/logout-all` | Customer and staff sign-in |
| POST | `/api/auth/forgot-password`, `/reset-password` | Password reset |
| GET/POST | `/api/auth/setup` | Owner set-up (works once) |
| POST | `/api/auth/token/refresh`, `/token/revoke` | JWT tokens for a future app (sign in with header `x-brewgrillz-client: app`) |
| GET | `/api/account/orders`, `/bookings`, `/points` | My account |
| PATCH | `/api/account/profile` | Update name, mobile, WhatsApp |
| * | `/api/admin/*` | Staff dashboard (staff and admin only) |

## Sprint status

- ✅ Sprint 0 — repo, design system, MoCo motion library, `/styleguide`
- ✅ Sprint 1 — home page
- ✅ Sprint 2 — menu page and menu data
- ✅ Sprint 3 — Neon database, cart, pickup checkout, Stripe, email and WhatsApp notifications, order tracking, restructured into `frontend` and `backend` like Ruchi
- ✅ Sprint 4 — table bookings, events and party enquiries, Bar, Our Place, privacy and terms; Track your order like Ruchi, neon map, cart delete buttons, menu links fixed
- ✅ Sprint 5 — Rewards Club, customer accounts, owner set-up once, staff sign-in, staff dashboard (orders, bookings, events, menu, rewards, settings, team, reports)
- Sprint 6 — polish, SEO, full QA, speed and load tests, launch
