# BrewGrillz QA report (Sprint 6)

Tested 18 November 2026 on the full Sprint 0–6 code, run locally: Node 22, PostgreSQL 16, test payments, emails saved to files, Chrome through Playwright.

## Summary

- **58 API tests and 37 browser tests (desktop and phone), all passing.** The browser tests include 13 pages at 8 screen sizes, accessibility scans on 24 pages, SEO checks and one of each of the 16 email types.
- **10 bugs found and fixed** (list below). None are open.
- **Security held:** the dashboard is locked for guests and customers, staff can't reach admin-only areas, private order links can't be guessed, and price tampering is refused. SQL injection, HTML in emails, CORS, forged webhooks, live-site settings, cookie flags and the sign-in limit all passed.
- **No double orders or overbooking:**
  - 10 identical orders at once made 1 order.
  - 5 checkouts spending the same 100 points at once let only 1 through.
  - 12 bookings at once for 2 free tables never went over 2.
- **Speed:**
  - Desktop Lighthouse 94–100. Phone 74–89, up from 67–85.
  - Layout shift is 0 on every page.
  - The k6 dinner rush ran with 0 failures; 95% of pages answered within 5 ms.
  - The server now handles about 1,000 requests a second before slowing down, up from about 200.
- **Not covered:**
  - Safari and Firefox (only Chrome is installed here; check them on staging).
  - A real screen reader (axe and keyboard checks were used instead).
  - Live Stripe and Resend (the network is blocked here; a fake Stripe server and signed webhooks were used instead).

## Results by area

| Area | Tests | Pass |
| --- | --- | --- |
| Pickup orders (API) | 9 | 9 |
| Stripe payments (API, fake Stripe) | 6 | 6 |
| Table bookings and events (API) | 5 | 5 |
| Accounts, Rewards and team (API) | 7 | 7 |
| Security (API) | 16 | 16 |
| Integrity under pressure (API) | 7 | 7 |
| Input checks (API) | 8 | 8 |
| Ordering in the browser (desktop and phone) | 7 | 7 |
| Accounts and bookings in the browser (desktop and phone) | 7 | 7 |
| Staff dashboard in the browser | 6 | 6 |
| Responsive, 8 screen sizes × 13 pages | 8 | 8 |
| Accessibility (axe WCAG 2.1 AA + keyboard) | 4 | 4 |
| SEO | 4 | 4 |
| Emails, 16 types | 1 | 1 |

## Bugs fixed

### BUG-01 High: pickup times very slow under load

- **Found by:** k6 stress test.
- **Problem:** the pickup-times list took 7.8 s to answer at 150 requests a second, so checkout would have stalled on a busy night. It built a new date formatter for each of its ~300 times on every request.
- **Fix:** formatters are made once and reused. It now answers in 2 ms, and the server's limit went from about 200 to about 1,000 requests a second.

### BUG-02 Medium: mobile numbers with a dash were refused

- **Problem:** checkout accepted `8123-4567`, but the server refused it, so the customer saw "Enter a Singapore mobile number" with no way to tell why.
- **Fix:** the server now accepts dashes, the same as the website (`api/07-validation`, VAL-01).

### BUG-03 Medium: "Sign out" on My account went to the sign-in page

- **Problem:** pressing Sign out landed on "Welcome back" instead of the home page, because the account page noticed the signed-out state first.
- **Fix:** signing out now goes home (`e2e/02`, ACC-01).

### BUG-04 Medium: after staff sign-in, the old custom cursor code kept running on the dashboard

- **Problem:** a moment after opening the dashboard there was a page error, and the site's custom cursor class stayed on.
- **Fix:** the cursor cleans up when leaving the website pages (`e2e/03`, STAFF-03).

### BUG-05 Medium: staff opening Team or Reports by address got an error

- **Problem:** the server correctly refused staff, but the page showed a raw error.
- **Fix:** the page now says "Only the owner or an admin can open this page."

### BUG-06 Medium: colour contrast below WCAG AA on 20+ pages

- **Problem:** small grey text (hints, notes, dates) and small red text (footer tagline, "Details" on dishes) were hard to read.
- **Fix:** the faint grey and small red were made brighter (5:1 contrast). The design looks the same.

### BUG-07 Low: accessibility labels

- The dashboard's date, table, note and settings inputs had no labels for screen readers.
- The scrolling photo strip couldn't be reached with the keyboard.
- The marquee used `aria-label` without a role.
- The "Main event" dish buttons had names that didn't match their text.

All fixed.

### BUG-08 Low: page jumps while loading (layout shift)

- **Problem:** headings jumped when the fonts arrived (CLS up to 0.22 on Bar, Track and Book a table), and checkout jumped when the saved cart loaded (0.31).
- **Fix:** the two main fonts now load straight away, and checkout keeps its height. CLS is now 0 everywhere.

### BUG-09 Low: two main headings on the menu page

- **Problem:** the print-only menu title was a second `h1`.
- **Fix:** it's now a plain title, so Google sees one main heading.

### BUG-10 Low: heavy navbar logo and favicon

- **Problem:** the logo was 40 KB and the favicon 22 KB, loaded on every page.
- **Fix:** they are now 23 KB and 8 KB.

## Found on staging (18 November)

### BUG-11 Critical: pages stop scrolling on phones after using the hamburger menu

- **Problem:** after tapping any link in the phone menu, the next page (and every page after it, including Home) couldn't be scrolled until the page was reloaded. The menu locked scrolling when it opened, but the unlock code sat after a check that stopped early once the menu had closed.
- **Why the tests missed it:** the phone tests opened every page directly by its address, which always starts unlocked. None of them moved between pages through the menu and then swiped.
- **Fix:** the unlock now always runs when the menu closes. Tapping the page you're already on also closes the menu (BUG-12).
- **New tests:** `e2e/08-mobile-navigation`: every menu link, the menu's buttons, the cart and the dish pop-up, each followed by a real finger swipe.

### BUG-12 Medium: tapping the current page in the phone menu left the menu open

Found by the new test. Fixed.

### Phone side margins and big screens

- Side margins on phones went from 17 px to 24 px, and the home headline is a little smaller on phones. The "Main event" section now stays inside the margins.
- On screens 2200 px and wider (big monitors, TVs), the whole site scales up a step instead of floating small in the middle.

## Also added in Sprint 6

- **SEO:**
  - Every public page has its own title, description, canonical link, and Open Graph and X sharing tags.
  - A 1200×630 sharing image (`/og-image.jpg`).
  - Google restaurant details on the home page: address, hours, phone, menu, order and booking links.
  - Private pages (checkout, track, sign-in, account, dashboard) are marked noindex.
- **The `perf/` and `launch/` folders,** like Ruchi.

## How to run it again

See `qa/README.md`. In short: start the backend and the built website, then run `npm run api` followed by `npm run e2e` in this folder.
