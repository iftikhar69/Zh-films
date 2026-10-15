"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import {
  BookOpen,
  CalendarHeart,
  Camera,
  Clapperboard,
  Film,
  Heart,
  Images,
  Instagram,
  Loader2,
  ShoppingBag,
  Users,
  UserRound
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import { useUi } from "@/stores/ui-store";
import type { SearchHit } from "@/app/api/search/route";

const PAGES = [
  { href: "/reels", label: "Reel Vault", icon: Film, keywords: "videos films trailers" },
  { href: "/gallery", label: "Gallery", icon: Images, keywords: "photos frames stills" },
  { href: "/hire", label: "Hire the Film Family", icon: Users, keywords: "crew team photographer" },
  { href: "/rent", label: "Rent gear", icon: Camera, keywords: "camera gimbal car rental" },
  { href: "/sell", label: "Vault sale", icon: ShoppingBag, keywords: "buy lens used" },
  { href: "/book", label: "Book your date", icon: CalendarHeart, keywords: "booking wedding event" },
  { href: "/favorites", label: "My favorites", icon: Heart, keywords: "saved watchlist liked" },
  { href: "/journal", label: "Film notes", icon: BookOpen, keywords: "blog journal articles" },
  { href: "/about", label: "About Zulfikar", icon: UserRound, keywords: "story director ceo" },
  { href: "/instagram", label: "Dailies wall", icon: Instagram, keywords: "instagram feed" }
];

export function CommandPalette() {
  const router = useRouter();
  const open = useUi((s) => s.searchOpen);
  const setOpen = useUi((s) => s.setSearchOpen);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ q: string; hits: SearchHit[] }>({ q: "", hits: [] });

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { hits: SearchHit[] };
        setResults({ q: term, hits: data.hits });
      } catch {
        if (!ctrl.signal.aborted) setResults({ q: term, hits: [] });
      }
    }, 180);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [q]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  const term = q.trim().toLowerCase();
  const searching = term.length >= 2;
  const hits = searching && results.q.toLowerCase() === term ? results.hits : [];
  const loading = searching && results.q.toLowerCase() !== term;
  const pages = PAGES.filter(
    (p) => !term || p.label.toLowerCase().includes(term) || p.keywords.includes(term)
  );
  const groups = ["Reels", "Film Family", "Gear", "Journal"] as const;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[12svh] z-[151] w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 outline-none"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">Search ZH Films</DialogPrimitive.Title>
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="overflow-hidden rounded-2xl border border-zh-gold/25 shadow-[0_30px_120px_rgba(0,0,0,0.8),0_0_60px_rgba(200,169,106,0.12)]"
          >
            <Command shouldFilter={false} loop>
              <CommandInput
                value={q}
                onValueChange={setQ}
                placeholder="Search reels, crew, cameras, articles…"
                autoFocus
              />
              <CommandList data-lenis-prevent>
                {loading ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-xs text-zinc-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-zh-gold" /> Searching the vault…
                  </div>
                ) : null}

                {!loading && term.length >= 2 && hits.length === 0 && pages.length === 0 ? (
                  <CommandEmpty>Nothing on the lot matches “{q}”.</CommandEmpty>
                ) : null}

                {groups.map((g) => {
                  const items = hits.filter((h) => h.group === g);
                  if (!items.length) return null;
                  return (
                    <CommandGroup key={g} heading={g}>
                      {items.map((h) => (
                        <CommandItem key={`${g}-${h.id}`} value={`${g}-${h.id}`} onSelect={() => go(h.href)}>
                          {h.image ? (
                            <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded-md border border-white/10">
                              <Image src={h.image} alt="" fill sizes="56px" className="object-cover" />
                            </span>
                          ) : (
                            <Clapperboard className="h-4 w-4 text-zh-gold" />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-zinc-100">{h.title}</span>
                            <span className="block truncate text-xs text-zinc-500">{h.subtitle}</span>
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })}

                {hits.length && pages.length ? <CommandSeparator /> : null}

                {pages.length ? (
                  <CommandGroup heading="Jump to">
                    {pages.map((p) => (
                      <CommandItem key={p.href} value={p.href} onSelect={() => go(p.href)}>
                        <p.icon className="h-4 w-4 text-zh-gold" />
                        {p.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
              </CommandList>
              <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 text-[10px] uppercase tracking-[0.25em] text-zinc-600">
                <span>↑↓ navigate · ↵ open</span>
                <span>esc close</span>
              </div>
            </Command>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
