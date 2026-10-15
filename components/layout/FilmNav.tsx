"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Heart, Menu, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/constants";
import { FILM_FAMILY, waLink } from "@/lib/film-family";
import { CinemaModeToggle } from "@/components/layout/CinemaModeToggle";
import { useSoundscape } from "@/hooks/useSoundscape";
import { AuthControls } from "@/components/auth/AuthControls";
import { Magnetic } from "@/components/motion/Magnetic";
import { useFavoriteCount } from "@/stores/favorites-store";
import { useUi } from "@/stores/ui-store";

const links = [
  { href: "/reels", label: "Reels" },
  { href: "/gallery", label: "Gallery" },
  { href: "/hire", label: "Family" },
  { href: "/rent", label: "Rent" },
  { href: "/sell", label: "Sell" },
  { href: "/journal", label: "Journal" },
  { href: "/about", label: "About" }
];

const mobileLinks = [
  { href: "/", label: "Opening" },
  { href: "/book/wedding", label: "Wedding packages" },
  { href: "/book/event", label: "Book an event" },
  ...links,
  { href: "/instagram", label: "Dailies" },
  { href: "/account", label: "My bookings" }
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function FilmNav() {
  const pathname = usePathname();
  const { shutter } = useSoundscape();
  const favCount = useFavoriteCount();
  const setSearchOpen = useUi((s) => s.setSearchOpen);
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  // Scroll fires every frame; only touch React state when a value actually flips.
  const navState = useRef({ hidden: false, scrolled: false });
  useMotionValueEvent(scrollY, "change", (y) => {
    const delta = y - (scrollY.getPrevious() ?? 0);
    const nextScrolled = y > 24;
    const nextHidden = Math.abs(delta) < 4 ? navState.current.hidden : y > 240 && delta > 0 && !menuOpen;
    if (nextScrolled !== navState.current.scrolled) {
      navState.current.scrolled = nextScrolled;
      setScrolled(nextScrolled);
    }
    if (nextHidden !== navState.current.hidden) {
      navState.current.hidden = nextHidden;
      setHidden(nextHidden);
    }
  });

  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const activeHref = links.find((l) => isActive(pathname, l.href))?.href ?? null;
  const pill = hovered ?? activeHref;

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-[70] px-3 pt-3 sm:px-5"
        animate={{ y: hidden ? -110 : 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className={cn(
            "mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-full border px-3 py-2 transition-all duration-500 sm:px-4",
            scrolled || menuOpen
              ? "border-white/10 bg-black/70 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl"
              : "border-transparent bg-transparent"
          )}
        >
          <Link href="/" className="group flex items-center gap-2.5" onClick={() => shutter()} aria-label="ZH Films home">
            <motion.span
              whileHover={{ rotate: -12, scale: 1.08 }}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-zh-gold/50 bg-black/60 font-display text-[11px] font-bold text-zh-gold"
            >
              ZH
              <span className="zh-rec-dot absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
            </motion.span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="font-display text-sm font-semibold tracking-wide text-white">{BRAND.name}</span>
              <span className="text-[9px] uppercase tracking-[0.35em] text-zinc-500">Film Family · Lahore</span>
            </span>
          </Link>

          <nav className="hidden items-center lg:flex" onPointerLeave={() => setHovered(null)}>
            {links.map((l) => {
              const active = activeHref === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => shutter()}
                  onPointerEnter={() => setHovered(l.href)}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-[11px] uppercase tracking-[0.22em] transition-colors",
                    active ? "text-zh-gold" : "text-zinc-400 hover:text-white"
                  )}
                >
                  {pill === l.href ? (
                    <motion.span
                      layoutId="nav-pill"
                      className={cn(
                        "absolute inset-0 -z-10 rounded-full",
                        active ? "bg-zh-gold/12 ring-1 ring-zh-gold/40" : "bg-white/[0.06]"
                      )}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-9 items-center gap-2 rounded-full border border-white/10 px-2.5 text-zinc-400 transition hover:border-zh-gold/40 hover:text-white"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
              <kbd className="hidden rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 xl:inline">⌘K</kbd>
            </button>

            <Link
              href="/favorites"
              aria-label={`Favorites (${favCount})`}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-full border transition",
                isActive(pathname, "/favorites")
                  ? "border-rose-400/50 bg-rose-500/15 text-rose-300"
                  : "border-white/10 text-zinc-300 hover:border-rose-400/40 hover:text-rose-300"
              )}
            >
              <Heart className={cn("h-4 w-4", favCount > 0 && "fill-rose-400 text-rose-400")} />
              <AnimatePresence>
                {favCount > 0 ? (
                  <motion.span
                    key={favCount}
                    initial={{ scale: 0, y: 4 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 18 }}
                    className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 font-mono text-[10px] font-bold text-white"
                  >
                    {favCount}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </Link>

            <div className="hidden items-center gap-1.5 md:flex">
              <AuthControls />
              <CinemaModeToggle />
            </div>

            <Magnetic className="hidden sm:inline-block">
              <Link
                href="/book"
                onClick={() => shutter()}
                className="group relative inline-flex h-9 items-center overflow-hidden rounded-full bg-zh-gold px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-black"
              >
                <span className="absolute inset-0 -translate-x-full bg-white/40 transition-transform duration-500 group-hover:translate-x-0" />
                <span className="relative">Book</span>
              </Link>
            </Magnetic>

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-200 lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={menuOpen ? "x" : "menu"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            key="mobile-menu"
            className="fixed inset-0 z-[65] flex flex-col overflow-y-auto bg-zh-black/95 px-6 pb-10 pt-28 backdrop-blur-2xl lg:hidden"
            initial={{ clipPath: "circle(0% at calc(100% - 40px) 36px)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 40px) 36px)" }}
            exit={{ clipPath: "circle(0% at calc(100% - 40px) 36px)" }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
            data-lenis-prevent
          >
            <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-zh-gold/20 blur-3xl" />
            <nav className="relative flex flex-col">
              {mobileLinks.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.045, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-baseline gap-4 border-b border-white/5 py-3 font-display text-3xl font-semibold uppercase tracking-tight transition-colors",
                      isActive(pathname, l.href) ? "text-zh-gold" : "text-white hover:text-zh-gold"
                    )}
                  >
                    <span className="font-mono text-[10px] text-zinc-600">{String(i + 1).padStart(2, "0")}</span>
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <motion.div
              className="relative mt-8 flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Link href="/book" onClick={() => setMenuOpen(false)} className="rounded-full bg-zh-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black">
                Book your date
              </Link>
              <a
                href={waLink("Hi ZH Films! I'd like to talk about a project.")}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/15 px-6 py-3 text-xs uppercase tracking-[0.2em] text-zinc-300"
              >
                WhatsApp
              </a>
              <div className="flex flex-wrap items-center gap-1.5">
                <AuthControls onNavigate={() => setMenuOpen(false)} />
                <CinemaModeToggle />
              </div>
            </motion.div>
            {FILM_FAMILY.email ? (
              <p className="relative mt-auto pt-10 text-[10px] uppercase tracking-[0.35em] text-zinc-600">{FILM_FAMILY.email}</p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
