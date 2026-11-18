# Performance

Speed (Lighthouse) and load (k6) tests, like Ruchi. Run them against your laptop or staging, **never the live site** (a load test on live looks like an attack and fills the database with test orders).

## Lighthouse (page speed)

Needs the built site running (`cd frontend && npm run build && npm run preview`).

```bash
cd perf
npm install
npm run lighthouse
```

Scores for phone and desktop print in the terminal; full reports go to `perf/lighthouse/results/<LABEL>/`.

- Another site: `SITE=https://staging-site npm run lighthouse`
- Some pages only: `PAGES=/,/menu npm run lighthouse`

## k6 (how many visitors at once)

Install k6 once: `brew install k6` (Mac). Needs the backend running in test mode (`cd backend && npm run dev`).

```bash
cd perf
npm run k6          # dinner rush: about 190 people at once for 3 minutes
npm run k6:stress   # keeps adding traffic until it slows down, to find the limit
```

The dinner rush mixes: 150 people browsing the menu and booking pages, 30 pickup orders a minute (order, pay, status page), 6 table bookings a minute, 40 people in one office sharing one internet address, and 3 staff with the dashboard open. It passes when fewer than 1% of requests fail and 95% of pages answer within 0.4 s (orders within 1.2 s).

Busier: `SCALE=2 HOLD=10m npm run k6`. Against staging: `API=https://staging-api/api npm run k6` (the staff part signs in with `STAFF_EMAIL` and `STAFF_PASSWORD`).

## Sprint 6 results (laptop, Node 22, PostgreSQL 16, 2 CPU cores shared with k6)

### Lighthouse (after the Sprint 6 fixes)

| Page | Phone | Desktop |
| --- | --- | --- |
| Home | 74 | 94 |
| Menu | 80 | 99 |
| Bar | 84 | 99 |
| Our Place | 77 | 98 |
| Events | 80 | 98 |
| Book a table | 78 | 98 |
| Rewards | 88 | 100 |
| Checkout | 85 | 99 |
| Track | 88 | 100 |
| Sign in | 89 | 99 |
| Privacy | 89 | 100 |

- Accessibility 98–100, Best practices 100, SEO 100 on every public page. Checkout, Track and Sign in show SEO 58–69 only because they are deliberately hidden from Google.
- Layout shift (CLS) is now **0 on every page** (it was up to 0.31). Fixed by loading the two main fonts straight away and keeping the checkout's height while the saved cart loads.
- Phone scores went from 67–85 to 74–89. Lighthouse simulates a slow 4G phone; the real first paint measured in the same runs was under 0.4 s. The rest of the gap is the animation library and the food photos, which are part of the design.

### k6 dinner rush

| | Result |
| --- | --- |
| Requests | 8,603 in 4.5 minutes, 0 failed |
| Pages and menu (p95) | 5 ms |
| Placing an order (p95) | 44 ms |
| Whole checkout (order, pay, status) | 66 ms average |
| Dashboard (p95) | 25 ms |
| Orders placed / tables booked | 76 / 25 |
| Office of 40 on one address | never rate-limited |
| All checks | 100% (2,858 of 2,858) |

### k6 stress (finding the limit)

| | Before | After |
| --- | --- | --- |
| Stopped at | about 200 requests a second | about 1,000 requests a second |
| 95% answered within | 2.1 s | 10 ms (up to 800 a second) |
| Failed requests | 0 | 0 |

**Fixed:** the pickup-times list built a new date formatter for every one of its ~300 times on each request. At 150 requests a second that took 7.8 s per answer; now it takes 2 ms. The menu is also prepared once per version (with a ready-made compressed copy), and browsers that already have it get a tiny "not changed" answer.

A Friday night at BrewGrillz is far below these numbers: even 1,000 people on the site at once make roughly 20–40 requests a second.
