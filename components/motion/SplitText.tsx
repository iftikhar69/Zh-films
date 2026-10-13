"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  className?: string;
  charClassName?: string;
  delay?: number;
  stagger?: number;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  inView?: boolean;
};

/** Per-character mask reveal. Screen readers get the plain string via aria-label. */
export function SplitText({
  text,
  className,
  charClassName,
  delay = 0,
  stagger = 0.035,
  as = "span",
  inView = false
}: Props) {
  const Tag = motion[as];
  const words = text.split(" ");
  let index = 0;

  const trigger = inView
    ? { whileInView: "show", viewport: { once: true, margin: "-10% 0px" } }
    : { animate: "show" };

  return (
    <Tag aria-label={text} className={cn("inline-block", className)} initial="hidden" {...trigger}>
      {words.map((word, w) => (
        <span key={`${word}-${w}`} aria-hidden className="inline-flex overflow-hidden pb-[0.12em] align-bottom">
          {Array.from(word).map((ch) => {
            const i = index++;
            return (
              <motion.span
                key={i}
                className={cn("inline-block will-change-transform", charClassName)}
                variants={{
                  hidden: { y: "110%", rotate: 8, opacity: 0 },
                  show: {
                    y: "0%",
                    rotate: 0,
                    opacity: 1,
                    transition: { duration: 0.9, delay: delay + i * stagger, ease: [0.16, 1, 0.3, 1] }
                  }
                }}
              >
                {ch}
              </motion.span>
            );
          })}
          {w < words.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
        </span>
      ))}
    </Tag>
  );
}
