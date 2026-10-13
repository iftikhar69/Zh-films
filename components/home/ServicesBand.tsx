import { Marquee } from "@/components/motion/Marquee";

const SERVICES = ["Wedding films", "AKU convocations", "Mehndi & pre-events", "Brand commercials", "Drone cinema", "Photography", "Gear rental"];

export function ServicesBand() {
  return (
    <section aria-label="What we film" className="relative overflow-hidden py-10">
      <div className="-rotate-2 scale-105 border-y border-zh-gold/30 bg-zh-gold py-4 text-black">
        <Marquee seconds={30}>
          {SERVICES.map((s) => (
            <span key={s} className="flex items-center gap-6 pr-6 font-display text-2xl font-bold uppercase sm:text-4xl">
              {s}
              <span aria-hidden className="text-xl">✦</span>
            </span>
          ))}
        </Marquee>
      </div>
      <div className="mt-[-1.25rem] rotate-1 border-y border-white/10 bg-zh-black py-3">
        <Marquee seconds={40} reverse>
          {SERVICES.map((s) => (
            <span key={s} className="zh-text-outline flex items-center gap-6 pr-6 font-display text-xl font-bold uppercase sm:text-3xl">
              {s}
              <span aria-hidden className="text-zh-gold/50">●</span>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
