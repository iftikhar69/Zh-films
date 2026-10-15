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
# Zh-films
