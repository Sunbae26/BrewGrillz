# QA

Automatic tests for the whole site, like Ruchi. Use a local or test database, never the live one: the tests create orders, bookings, accounts and the dashboard accounts `qa-admin@brewgrillz.test` and `qa-staff@brewgrillz.test`.

## 1. Start everything (3 terminals)

```bash
# Terminal 1: backend in local test mode (the defaults in backend/.env.example: PAYMENT_PROVIDER=test, EMAIL_PROVIDER=file)
cd backend
npm run dev
```

```bash
# Terminal 2: the built website on port 4173
cd frontend
npm run build
npm run preview
```

```bash
# Terminal 3: the tests
cd qa
npm install
npx playwright install chromium
```

## 2. Run the tests

```bash
npm run api     # 7 files, 58 API tests (about 2 minutes)
npm run e2e     # browser tests on desktop and phone (about 5 minutes)
```

Run `npm run api` first: the email check in `npm run e2e` looks at the emails the API tests produce.

| File | What it checks |
| --- | --- |
| `api/01-orders` | Pickup orders: prices from the server, options, sizes, alcohol refused, sold out, refunds, staff actions |
| `api/02-payments` | Stripe: payment page, webhooks, wrong amounts, expired sessions, refunds (a fake Stripe, no keys needed) |
| `api/03-bookings` | Table bookings and event enquiries |
| `api/04-accounts` | Sign up and sign in, owner set-up once, points (earn, spend, dine-in, cancel), team permissions, password reset |
| `api/05-security` | Dashboard locked for guests and customers, staff limits, private order links, SQL injection, CORS, headers, webhooks, live-site settings, cookies, sign-in limits |
| `api/06-integrity` | Double clicks, the same order 10 times at once, points spent twice at once, overbooking with 12 bookings at once, paused orders |
| `api/07-validation` | Phone numbers, names, emails, quantities, dates, and HTML typed into forms never reaching emails as code |
| `e2e/01-orders` | Ordering in the browser as a guest, checkout errors, cart, tracking, menu links |
| `e2e/02-accounts-bookings` | Sign up, sign in, Rewards points at checkout, booking a table, event enquiry |
| `e2e/03-staff` | The dashboard: orders board, sold out, staff limits, adding staff, every tab |
| `e2e/04-responsive` | 13 pages at 8 screen sizes: nothing scrolls sideways |
| `e2e/05-accessibility` | axe (WCAG 2.1 AA) on public and dashboard pages, keyboard use |
| `e2e/06-seo` | Titles, descriptions, canonical links, sharing image, Google restaurant details, sitemap, robots.txt |
| `e2e/08-mobile-navigation` | On a phone: every link in the hamburger menu, the cart and the dish pop-up, then a real swipe to check the page still scrolls; side margins on every page |
| `e2e/07-emails` | One of each email type: correct values, brand, contact details, fits a phone |

Results, screenshots and failure traces go to `qa/results/` (not committed).

Against staging: `QA_SITE=https://staging-site QA_API=https://staging-api/api npm run e2e` (browser tests only; the API tests need the local backend because they read its email files and start test servers).

See `REPORT.md` for the Sprint 6 results.
