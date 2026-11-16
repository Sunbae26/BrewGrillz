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
2. `cd server && npx prisma migrate dev --name init && npm run db:seed`

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

## Sprint status
- ✅ Sprint 0 — repo, server, schema, deploy configs, design system, MoCo motion library, `/styleguide`
- ✅ Sprint 1 — home page
- ⏭ Sprint 2 — menu (DB-driven, from the Jan 2026 PDF)
