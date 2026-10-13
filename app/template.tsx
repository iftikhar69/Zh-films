"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";

// The first paint is server-rendered and owned by the preloader; only client navigations get the wipe.
let navigatedOnce = false;

export default function Template({ children }: { children: React.ReactNode }) {
  const animate = navigatedOnce;
  useEffect(() => {
    navigatedOnce = true;
  }, []);

  return (
    <>
      {animate ? (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[95] origin-top bg-gradient-to-b from-zh-black via-[#140f08] to-zh-black"
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0 }}
          transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
        />
      ) : null}
      <motion.div
        initial={animate ? { opacity: 0, y: 28 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </>
  );
}
