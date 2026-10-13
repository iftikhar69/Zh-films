"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useUi } from "@/stores/ui-store";

const SEEN_KEY = "zh_intro_seen";

/**
 * Film-leader countdown shown once per browser session. An inline script in the
 * root layout marks <html data-intro="seen"> before paint so returning visitors
 * never see a flash of the overlay.
 */
export function Preloader() {
  const [count, setCount] = useState(3);
  const [visible, setVisible] = useState(true);
  const setIntroDone = useUi((s) => s.setIntroDone);

  useEffect(() => {
    if (!visible) setIntroDone();
  }, [visible, setIntroDone]);

  useEffect(() => {
    if (document.documentElement.dataset.intro === "seen") {
      setVisible(false);
      return;
    }
    sessionStorage.setItem(SEEN_KEY, "1");
    const timers = [
      window.setTimeout(() => setCount(2), 550),
      window.setTimeout(() => setCount(1), 1100),
      window.setTimeout(() => setCount(0), 1650),
      window.setTimeout(() => setVisible(false), 2500)
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="preloader"
          className="zh-preloader fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-zh-black"
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          onClick={() => setVisible(false)}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background:repeating-linear-gradient(0deg,#fff_0_1px,transparent_1px_4px)]" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />

          <AnimatePresence mode="wait">
            {count > 0 ? (
              <motion.div
                key={count}
                className="relative flex h-56 w-56 items-center justify-center sm:h-72 sm:w-72"
                initial={{ opacity: 0, scale: 1.15 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.22 }}
              >
                <div className="absolute inset-0 rounded-full border-2 border-white/20" />
                <div className="absolute inset-4 rounded-full border border-white/10" />
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "conic-gradient(from 0deg, rgba(200,169,106,0.55) var(--sweep), transparent var(--sweep))"
                  }}
                  initial={{ "--sweep": "0deg" } as Record<string, string>}
                  animate={{ "--sweep": "360deg" } as Record<string, string>}
                  transition={{ duration: 0.55, ease: "linear" }}
                />
                <span className="relative font-display text-8xl font-bold text-white sm:text-9xl">{count}</span>
              </motion.div>
            ) : (
              <motion.div
                key="title"
                className="relative text-center"
                initial={{ opacity: 0, letterSpacing: "0.9em" }}
                animate={{ opacity: 1, letterSpacing: "0.32em" }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="font-display text-4xl font-bold uppercase text-white sm:text-6xl">ZH Films</p>
                <p className="mt-3 text-[10px] uppercase tracking-[0.5em] text-zh-gold">Lahore · Est. 7+ years</p>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-zinc-600">
            Tap to skip
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export const introScript = `try{if(sessionStorage.getItem("${SEEN_KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.dataset.intro="seen"}catch(e){}`;
