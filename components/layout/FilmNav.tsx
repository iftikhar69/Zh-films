"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/constants";
import { CinemaModeToggle } from "@/components/layout/CinemaModeToggle";
import { useSoundscape } from "@/hooks/useSoundscape";
import { AuthControls } from "@/components/auth/AuthControls";

const links = [
  { href: "/", label: "Opening" },
  { href: "/instagram", label: "Dailies" },
  { href: "/hire", label: "Family" },
  { href: "/rent", label: "Rent" },
  { href: "/sell", label: "Sell" },
  { href: "/book", label: "Book" }
];

export function FilmNav() {
  const pathname = usePathname();
  const { shutter } = useSoundscape();

  return (
    <header className="fixed inset-x-0 top-0 z-[60] border-b border-white/5 bg-black/92">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2" onClick={() => shutter()}>
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-zh-gold/40 bg-black/60 text-[10px] font-mono text-zh-gold">
            ZH
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-wide text-white">{BRAND.name}</span>
            <span className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">Film Family</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => shutter()}
                className={cn(
                  "relative rounded-full px-3 py-2 text-xs uppercase tracking-[0.22em] transition",
                  active ? "bg-white/5 text-zh-gold ring-1 ring-zh-gold/30" : "text-zinc-400 hover:text-white"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <AuthControls />
          <CinemaModeToggle />
        </div>
      </div>

      <div className="flex overflow-x-auto border-t border-white/5 px-2 py-2 xl:hidden">
        {[...links, { href: "/account", label: "Sheet" }].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => shutter()}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]",
              pathname === l.href ? "bg-zh-gold/15 text-zh-gold ring-1 ring-zh-gold/40" : "text-zinc-400"
            )}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}