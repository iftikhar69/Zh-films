"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Particle = { id: number; x: number; y: number; s: number; o: number };

/** Lightweight CSS dust — no per-particle Framer Motion (scroll-lag fix). */
export function DustParticles({ count = 16 }: { count?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onMq = () => setReduced(mq.matches);
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let latest = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      latest = {
        x: ((e.clientX - r.left) / r.width - 0.5) * 18,
        y: ((e.clientY - r.top) / r.height - 0.5) * 14
      };
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setOffset(latest);
        raf = 0;
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const particles = useMemo(() => {
    const out: Particle[] = [];
    for (let i = 0; i < count; i++) {
      out.push({
        id: i,
        x: (i * 37) % 100,
        y: (i * 53) % 100,
        s: 1 + (i % 3),
        o: 0.2 + (i % 5) * 0.08
      });
    }
    return out;
  }, [count]);

  if (reduced) return null;

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0 will-change-transform"
        style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
      >
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-zh-gold/40"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.s,
              height: p.s,
              opacity: p.o,
              boxShadow: "0 0 6px rgba(200,169,106,0.25)"
            }}
          />
        ))}
      </div>
    </div>
  );
}
