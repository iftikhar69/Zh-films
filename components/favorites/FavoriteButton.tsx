"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useFavorites } from "@/stores/favorites-store";
import { favoriteKey, type FavoriteType } from "@/lib/favorites";
import { cn } from "@/lib/utils";

const BURST = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2);

type Props = {
  type: FavoriteType;
  id: string;
  title?: string;
  /** Server-side love count; live count from the store wins once the user toggles. */
  count?: number;
  showCount?: boolean;
  className?: string;
  size?: "sm" | "md";
};

export function FavoriteButton({ type, id, title, count, showCount = false, className, size = "md" }: Props) {
  const key = favoriteKey(type, id);
  const active = useFavorites((s) => Boolean(s.keys[key]));
  const liveCount = useFavorites((s) => s.counts[key]);
  const toggle = useFavorites((s) => s.toggle);
  const shown = liveCount ?? count;
  const dim = size === "sm" ? "h-9 min-w-9" : "h-11 min-w-11";

  return (
    <motion.button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remove ${title ?? "item"} from favorites` : `Add ${title ?? "item"} to favorites`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle(type, id, title);
      }}
      whileTap={{ scale: 0.85 }}
      className={cn(
        "relative inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 backdrop-blur-md transition-colors",
        dim,
        active
          ? "border-rose-400/60 bg-rose-500/20 text-rose-300"
          : "border-white/15 bg-black/55 text-zinc-200 hover:border-zh-gold/60 hover:text-zh-gold",
        className
      )}
    >
      <span className="relative flex items-center justify-center">
        <motion.span
          key={active ? "on" : "off"}
          initial={{ scale: active ? 0.4 : 1 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 12 }}
          className="flex"
        >
          <Heart className={cn(size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]", active && "fill-rose-400 text-rose-400")} />
        </motion.span>
        <AnimatePresence>
          {active ? (
            <motion.span key="burst" className="pointer-events-none absolute inset-0" initial="a" animate="b" exit="a">
              <motion.span
                className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-rose-400"
                variants={{ a: { scale: 0, opacity: 1 }, b: { scale: 1.6, opacity: 0 } }}
                transition={{ duration: 0.5 }}
              />
              {BURST.map((angle, i) => (
                <motion.span
                  key={i}
                  className={cn(
                    "absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
                    i % 2 ? "bg-zh-gold" : "bg-rose-400"
                  )}
                  variants={{
                    a: { x: 0, y: 0, opacity: 1, scale: 1 },
                    b: { x: Math.cos(angle) * 22, y: Math.sin(angle) * 22, opacity: 0, scale: 0.3 }
                  }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              ))}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </span>
      {showCount && typeof shown === "number" ? (
        <motion.span
          key={shown}
          initial={{ y: -6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="font-mono text-[11px] tabular-nums"
        >
          {shown}
        </motion.span>
      ) : null}
    </motion.button>
  );
}
