# ZH Films — Legendary Cinematic Universe (Lahore)

Immersive multi-page filmmaker website engineered for **ZH Films** with deep blacks (`#080706`), warm cinema gold (`#c8a96a`), film grain, projector rays, desi filmy soul, and premium motion direction.

---

## Brand Story

- **CEO & Lead Cinematographer:** Zulfikar Hussain
- **Education:** Recently completed degree in Cinematic Films
- **Experience:** **7+ years** in cinematic wedding films, AKU events, pre-events, commercial productions, drone cinematography, and high-profile Lahore projects
- **Creative Force:** Passionate team of cinematographers, videographers, photographers, makeup & hair artists, and decoration/styling specialists

---

## Stack (locked)

- Next.js 16 App Router + TypeScript
- Tailwind CSS 4 + tw-animate
- Framer Motion 12
- shadcn/ui primitives (Dialog, Button, Input)
- Prisma + SQLite
- Zustand
- React Hook Form + Zod
- Bun/Docker ready

---

## App Router Scene Map

- `/` — **Living Viewfinder Hero** (short, cinematic, minimal text)
- `/reels` — **Reel Vault** with category filters + pagination + infinite scroll + load-more
- `/gallery` — Hybrid photo/video gallery with filters + pagination + append loading
- `/journal` — Film Notes with pagination and article pages
- `/about` — Zulfikar Hussain + full creative story
- `/book` — Multi-step cinematic booking flow
- `/hire` — Rich talent casting board with filters, hover previews, and date-picker booking modal

---

## Award-Winning Features Implemented

### 1) Living Viewfinder Hero
- Slow-motion cinematic video background
- Interactive 3D clapperboard: **“Directed by Zulfikar Hussain — Take 1”**
- Real-time HUD: REC blink, ISO shift, live timecode
- Mouse-reactive 3D dust + light leaks + scanlines + grain
- Two dominant cinematic CTAs only

### 2) Cinema Mode (Global)
- Global toggle with persistent mood
- Theater curtains + stronger vignette + projector beams
- Film burn route transitions
- Optional projector hum + emotional piano swell

### 3) Reel Vault + Gallery
- Reel categories: `weddings`, `pre-events`, `aku`, `commercial`
- Reels API supports category + paging
- Hover mini-trailer overlays on reel cards
- Gallery uses proper paging + category filters + load-more strip behavior
- Added **Film Dust Gallery** interaction to reveal hidden projects

### 4) Emotion Engine
- Mood selector: Romantic, Dramatic, Grand, Intimate (mapped in UI)
- Generates custom teaser vibe panel with cinematic preview mood

### 5) Hire / Talent Upgrade (Major)
- Role/experience/specialty filters
- Premium talent cards:
  - Cinematographer / Videographer
  - Photographer
  - Makeup & Hair Artist
  - Decoration & Styling Team
- Hover preview video snippets + film-strip presentation
- “Book This Talent” modal with **date picker** + custom brief

### 6) Booking + Director’s Cut Club
- Multi-step booking flow with RHF + Zod validation
- Premium Director’s Cut popup with validated email capture + instant discount

### Performance Fixes (Scroll Lag)
- Cinema Mode **defaults OFF** (curtains no longer crush scroll)
- Film grain / light leaks are **static** (no continuous transforms)
- Scanlines only render in Cinema Mode
- Dust particles cut from 48 Framer Motion nodes → **14 CSS particles** with rAF-throttled pointer
- Film-burn nav flash is a lightweight CSS overlay (no Framer springs)
- Reel/Gallery cards are **image-only**; video loads only inside Theater Viewer
- `prefers-reduced-motion` respected globally

### Full-Screen Theater Viewer
- `/reels` + `/gallery` open a true theater portal
- Keyboard: `←` / `→` (or H/L), `Space` play/pause, `Esc` exit
- Applause cue on open when sound is enabled

### Cinematic SEO
- Per-route Open Graph + Twitter cards via `lib/seo.tsx`
- JSON-LD: MovieTheater org + Person (Zulfikar) + Breadcrumbs
- Canonical URLs + OG artwork at `/og/default.svg`
- Set `NEXT_PUBLIC_SITE_URL` for production absolute URLs

---

## APIs

- `GET /api/reels?page=&category=` → paginated reels
- `GET /api/gallery?page=&category=` → paginated gallery
- `GET /api/journal?page=` → paginated journal
- `GET /api/instagram` → live or fallback set feed
- `POST /api/newsletter` → Director’s Cut signup

All listing APIs return:

```ts
{ page, pageSize, total, totalPages, hasMore, items }
```

---

## Local Run

```bash
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

---

## Docker

```bash
docker compose up --build
```

---

Crafted with pure cinematic soul, desi filmy magic, 7+ years of real passion, and award-winning excellence.
# Zh-films
# Zh-films
