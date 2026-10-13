"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function CategoryPills({
  categories,
  active,
  hrefFor,
  layoutId
}: {
  categories: readonly string[];
  active: string;
  hrefFor: (c: string) => string;
  layoutId: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => {
        const on = c === active;
        return (
          <Link
            key={c}
            href={hrefFor(c)}
            scroll={false}
            className={cn(
              "relative rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.22em] transition-colors",
              on ? "border-transparent text-black" : "border-white/10 text-zinc-400 hover:border-zh-gold/40 hover:text-white"
            )}
          >
            {on ? (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-zh-gold shadow-[0_0_30px_rgba(200,169,106,0.35)]"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            ) : null}
            <span className="relative">{c}</span>
          </Link>
        );
      })}
    </div>
  );
}
