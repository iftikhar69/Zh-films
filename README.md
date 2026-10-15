# ZH Films — Cinematic studio site (Lahore)

Full-stack, heavily animated website for **ZH Films**, the wedding, AKU-event and commercial film house led by
**Zulfikar Hussain**. Visitors can watch reels, browse the gallery, heart their favorites, leave reviews, search
everything with ⌘K, hire crew, rent or buy gear, and book a date — all backed by a real database and API.

## Stack

- Next.js 16 (App Router) + TypeScript + React 19
- Tailwind CSS 4, shadcn/ui-style primitives (Dialog, Button, Input, Command, Sonner)
- Framer Motion 12 + Lenis smooth scroll
- Prisma + SQLite
- Zustand, React Hook Form + Zod
- Clerk (optional) for sign-in and the admin desk

## Run locally

```bash
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev -- -p 4317
```

Open http://localhost:4317. Clerk keys are optional; without them everything works and favorites are tied to an
anonymous browser cookie.

## What's on the lot

| Route        | What it does                                                                                  |
| ------------ | --------------------------------------------------------------------------------------------- |
| `/`          | Animated opening: film-leader intro, letterbox hero, pinned reel strip, process, rankings, reviews |
| `/reels`     | Reel Vault — category filters, infinite scroll, theater player, hearts and view counts        |
| `/gallery`   | Masonry stills and motion with theater viewer and hearts                                      |
| `/favorites` | Your watchlist — filter by type, remove, or turn it into a booking brief                       |
| `/hire`      | Film Family crew with animated role filter, hearts and hire requests                          |
| `/rent` `/sell` | Gear bay for rentals and vault sales                                                       |
| `/book`      | Multi-step booking (prefills references from favorites)                                       |
| `/journal` `/about` `/instagram` `/account` `/admin` | Film notes, story, dailies, call sheet, production office |

## Full-stack features

- **Favorites** — `Favorite` table keyed by owner (`visitor:<cookie>` or `user:<clerkId>`). When a visitor signs
  in, their anonymous favorites are moved to their account. Optimistic toggles with toasts, a live counter in the
  nav, and a "Most loved" ranking on the homepage computed from everyone's hearts.
- **Reviews** — visitors post star-rated reviews (Zod-validated) that appear immediately on the animated wall, with
  a live average.
- **Search** — ⌘K / `/` command palette searching reels, crew, gear and journal posts.
- **View counts** — every theater play increments the reel's views.

### API

| Method | Route                       | Purpose                                     |
| ------ | --------------------------- | ------------------------------------------- |
| GET    | `/api/favorites?expand=1`   | Your favorite keys (and cards when expanded) |
| POST   | `/api/favorites`            | Toggle `{ type: reel\|gallery\|crew\|gear, id }` |
| DELETE | `/api/favorites`            | Clear your favorites                        |
| GET    | `/api/favorites/top`        | Most-loved reels                            |
| GET/POST | `/api/reviews`            | List / create reviews                       |
| GET    | `/api/search?q=`            | Grouped search hits                         |
| POST   | `/api/reels/:id/view`       | Increment reel views                        |
| GET    | `/api/reels` `/api/gallery` `/api/journal` | Paginated listings (+ love counts) |
| POST   | `/api/bookings` `/api/hire` `/api/rent` `/api/sell` `/api/newsletter` | Inquiries |

## Motion system (`components/motion/`)

Preloader countdown (once per session), Lenis smooth scroll, scroll progress bar, trailing cursor with contextual
labels (`data-cursor="Play"`), split-text reveals, magnetic buttons, 3D tilt cards with glare, marquees, count-ups,
scroll-linked timelines and page-wipe transitions. `prefers-reduced-motion` disables the intro, smooth scroll and
cursor.

## Scripts

- `npm run dev` — dev server
- `npm run build` / `npm start` — production
- `npm run lint` — ESLint (Next core-web-vitals + TypeScript)
- `npm run db:push` / `npm run db:seed` — schema + demo data

## Docker

```bash
docker compose up --build
```

## Public site vs. private areas

- **Public pages** (home, reels, gallery, services, booking) never call private APIs. Clerk's client code, the search palette and the newsletter popup are loaded only when needed (`components/auth/AuthControls.tsx`, `components/search/SearchLauncher.tsx`, `components/marketing/LazyDirectorsCutClub.tsx`).
- **Client area** (`/account`): signed-in clients see their bookings with booking status and payment status. Bookings made before signing up are attached automatically when the booking email matches a **verified** email on their Clerk account.
- **Staff area** (`/admin`): checked on the server with `requireAdmin()` in `lib/auth.ts` — Clerk `publicMetadata.role = "admin"` (only settable from the Clerk dashboard or backend) or an email in `ADMIN_EMAILS`. Staff update booking and payment status through `PATCH /api/admin/bookings/:id`.

## Booking flow

`/book` works without an account. Drafts are saved in the browser session (so a trip to sign in does not lose them), `?service=` pre-fills coverage, and every submission carries an idempotency key so double clicks or retries never create duplicate bookings.

Booking statuses: `pending → confirmed → in_production → delivered` (or `cancelled`).

## Payments

There is **no online payment integration yet**, on purpose. `Booking.paymentStatus` (`not_requested`, `awaiting`, `paid`, `refunded`) is set **only by staff** after they confirm money has arrived, and clients see it read-only. Nothing on the client can mark a booking paid.

Before adding online payments, pick a provider that supports merchants in Pakistan (Stripe does not onboard Pakistani businesses). Candidates to evaluate: Safepay, PayFast (PK), JazzCash or Easypaisa merchant APIs. Whichever you pick, payment must be confirmed by a server-side webhook or verification call, which then moves `paymentStatus` to `paid`, and the SDK must load only on the payment route.

## Hero video

The temporary hero is a ZH Films Instagram reel. To replace it, overwrite `public/media/hero.mp4` (muted, H.264, `-movflags +faststart`) and the poster `public/media/instagram/DdvcGIvhk3U.jpg`, or set `NEXT_PUBLIC_HERO_VIDEO_URL` / `NEXT_PUBLIC_HERO_POSTER_URL` (see `lib/hero-media.ts`).

