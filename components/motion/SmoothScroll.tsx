"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

let lenisInstance: Lenis | null = null;

export function scrollToTarget(target: string | number | HTMLElement) {
  if (lenisInstance) lenisInstance.scrollTo(target, { offset: -80 });
  else if (typeof target === "number") window.scrollTo({ top: target, behavior: "smooth" });
  else if (typeof target === "string") document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
  else target.scrollIntoView({ behavior: "smooth" });
}

export function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      lerp: 0.16,
      wheelMultiplier: 1,
      prevent: (node) => Boolean(node.closest?.("[role='dialog'], [data-lenis-prevent], [cmdk-list]"))
    });
    lenisInstance = lenis;

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // Radix dialogs and the theater lock body scroll; Lenis must pause with them.
    const body = document.body;
    const sync = () => {
      const locked = body.hasAttribute("data-scroll-locked") || body.style.overflow === "hidden";
      if (locked) lenis.stop();
      else lenis.start();
    };
    const mo = new MutationObserver(sync);
    mo.observe(body, { attributes: true, attributeFilter: ["style", "data-scroll-locked"] });

    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);

  useEffect(() => {
    lenisInstance?.scrollTo(0, { immediate: true });
  }, [pathname]);

  return null;
}
