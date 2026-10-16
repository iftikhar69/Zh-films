# ZH Films — Cinematic studio site (Lahore)

Full-stack, heavily animated website for **ZH Films**, the wedding, AKU-event and commercial film house led by
**Zulfikar Hussain**. Visitors can watch reels, browse the gallery, heart their favorites, leave reviews, search
everything with ⌘K, hire crew, rent or buy gear, and book a date — all backed by a real database and API.

## Stack

- Next.js 16 (App Router) + TypeScript + React 19
- Tailwind CSS 4, shadcn/ui-style primitives (Dialog, Button, Input, Command, Sonner)
- Framer Motion 12 + Lenis smooth scroll
- Prisma + Postgres (Supabase), Supabase Storage for images
- Zustand, React Hook Form + Zod
- Clerk (optional) for sign-in and the admin desk

## Run locally

```bash
cp .env.example .env
npm install
# put your Supabase DATABASE_URL / DIRECT_URL in .env first
npm run db:deploy
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
- `npm test` — scheduling rules; `npm run test:workflow` — end-to-end booking/payment/email workflow on a throwaway database
- `npm run admin:grant -- <email>` / `-- <email> --revoke` / `-- --list` — owner admin bootstrap (see below)
- `npm run reminders` — run the reminder job once (same as the cron route)

## Docker

```bash
docker compose up --build
```

## Public site vs. private areas

- **Public pages** (home, reels, gallery, services, booking) never call private APIs. Clerk's client code, the search palette and the newsletter popup are loaded only when needed (`components/auth/AuthControls.tsx`, `components/search/SearchLauncher.tsx`, `components/marketing/LazyDirectorsCutClub.tsx`).
- **Client area** (`/account`): signed-in clients see their bookings with booking status and payment status. Bookings made before signing up are attached automatically when the booking email matches a **verified** email on their Clerk account.
- **Staff area** (`/admin`): every page and `/api/admin/*` route checks `requireAdmin()` (`lib/auth.ts`) on the server. Signed-out visitors are sent to sign-in (pages) or get `401` (APIs); signed-in non-admins get `404`/`403`. There is no admin signup.

## Owner admin setup (one time)

1. Put your Clerk keys in `.env` and start the site.
2. Go to `/sign-up`, create your account with the owner email and **verify the email** (Clerk sends a code).
3. On the server, run `npm run admin:grant -- you@example.com`. The script uses `CLERK_SECRET_KEY` to set `publicMetadata.role = "admin"` and refuses unverified emails. `npm run admin:grant -- --list` shows current admins.
4. Sign out and back in, then open `/admin`.

Alternative: list verified emails in `ADMIN_EMAILS`. To remove access: `npm run admin:grant -- you@example.com --revoke`.

## Admin dashboard

- **Overview** — pending requests, active holds, upcoming confirmed shoots, payments to verify (real counts only).
- **Bookings** — search (name, code, email, phone, city) and filters (status, held, service, payment, date range, upcoming); detail page with conflict warning, history and actions: confirm, decline, cancel, complete, place/release a timed hold, set quote and advance, add notes.
- **Calendar** — month view of confirmed bookings and active holds.
- **Payments** — submitted / verified / rejected tabs; verify or reject (with reason). Records who decided and when.
- **Settings** — Easypaisa and bank instructions, advance rules, hold length, notification email and reminder timings, policies; email log.

- **Packages** (`/admin/packages`) — edit names, prices, descriptions, inclusions, exclusions and add-ons, and enable/disable each. Stored in the `Setting` row `catalog`. Inclusions start empty on purpose: fill them in before advertising them.

## Wedding packages, event bookings and WhatsApp deals

- Three packages (Standard PKR 100,000, Premium PKR 150,000, Advance Premium PKR 200,000) are shown on the homepage and on `/book`.
- `/book/wedding?package=standard|premium|advance-premium` is a four-step form: up to 6 functions (each with its own date, time and venue), coverage, add-ons, budget and contact details. Email is optional, the draft survives going back, and a live estimate is shown.
- `/book/event` books Nikah, Engagement, Birthday, Corporate, Custom shoot or Other in advance. The server checks availability and the form says "subject to confirmation".
- Every function slot is stored in `BookingFunction` and counts toward availability, so a conflicting booking can't be confirmed.
- The server always recomputes the total from the catalog; it never trusts a total sent by the browser. Admins set the final quote, and the discount against the estimate is logged.
- "Discuss a deal on WhatsApp" saves the enquiry first, then opens `wa.me/<NEXT_PUBLIC_WHATSAPP>` with an encoded summary. The summary contains no internal notes or payment details. Opening WhatsApp does not book or confirm a date.

Migrations live in `prisma/migrations`. Create one with `npm run db:migrate`; Netlify runs `prisma migrate deploy` on every build. `npm run db:seed` wipes content and only runs with `ALLOW_DESTRUCTIVE_SEED=1` on a throwaway database.

## Booking flow and availability

`/book` works without an account: service, location, date, start/end time, requirements and contact. Drafts are saved in the browser session, `?service=wedding|nikah|event|shoot|photography|videography` pre-selects a service, and every submission carries an idempotency key so double clicks or retries never create duplicates.

Rules live in `lib/booking-rules.ts` and are enforced on the server:

| Rule | Value |
|---|---|
| Timezone | `Asia/Karachi` for all dates and times |
| Booking window | from 2 days to 2 years ahead |
| Time range | any start/end; an end before the start runs past midnight; max 16 hours |
| Team | one production team (`film-family`) — overlapping slots conflict |
| Buffers | per service setup/travel time before and after (e.g. wedding 90/60 min) |

How statuses affect availability:

| Status | Blocks the slot? |
|---|---|
| `pending` | no — new requests are *pending review* and never reserve the date. Only while an owner-placed hold is active (default 48 h, set in Settings) does it block, and the hold expires automatically |
| `confirmed`, `completed` | yes |
| `cancelled`, `declined` | no |

Concurrency: every booking write runs inside a transaction that first bumps the team's `ScheduleLock` row, so simultaneous requests are serialized before conflicts are checked. Staff confirming a request re-check conflicts the same way; only staff can override (recorded in the booking notes). The public `GET /api/bookings?date=YYYY-MM-DD` returns busy time ranges only — never names, contacts or statuses.

Tests: `npm test` (scheduling rules, timezone, buffers, holds) and `npm run test:workflow` (admin-only actions, overlapping confirms refused, hold expiry, cancellation releasing time, payments never auto-verified, email sending/dedupe/failure logging).

## Emails and reminders

Emails go through [Resend](https://resend.com) when `RESEND_API_KEY` and `EMAIL_FROM` are set. Without them nothing is sent; each message is logged as *skipped* in Settings → Email log and the dashboard shows a banner. Every email has a dedupe key, so retries and repeated cron runs never send twice; failures are logged with the error.

- Owner: new request, payment submitted, request still pending, payment awaiting verification, hold expired.
- Customer: request received (clearly *not* a reservation), hold placed, confirmed / declined / cancelled, advance requested and reminder, payment verified or rejected, hold expired.

Reminders run from `GET /api/cron/reminders` with `Authorization: Bearer $CRON_SECRET` (`vercel.json` schedules it every 30 minutes), or on a VPS with crontab: `*/30 * * * * cd /app && npm run reminders`.

## Payments (manual Easypaisa / bank transfer)

No payment gateway. The owner sets a quote and advance on a booking; the customer then sees the payment instructions from Settings on their private status page (`/booking/<code>?t=<token>`, linked in their emails and from `/account`). They submit the transaction reference and, optionally, a receipt (JPG, PNG, WebP or PDF, max 5 MB, checked by file signature). Receipts are stored outside `public/` in `storage/receipts` (or `RECEIPTS_DIR`) and are served only to admins.

A submission only moves payment status to **submitted**. Only an admin can verify (after ticking “I checked my account”) or reject it, and payment status never changes the booking status. Never ask customers for PINs, passwords or OTPs.

Hosting note: data lives in Supabase Postgres, so redeploys and restarts no longer wipe it. Payment receipts are still written to local disk; they move to Supabase Storage next.

## Hero video

The temporary hero is a ZH Films Instagram reel. To replace it, overwrite `public/media/hero.mp4` (muted, H.264, `-movflags +faststart`) and the poster `public/media/instagram/DdvcGIvhk3U.jpg`, or set `NEXT_PUBLIC_HERO_VIDEO_URL` / `NEXT_PUBLIC_HERO_POSTER_URL` (see `lib/hero-media.ts`).

