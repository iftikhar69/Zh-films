import Link from "next/link";
import { FILM_FAMILY } from "@/lib/film-family";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { SplitText } from "@/components/motion/SplitText";

const bays = [
  {
    slug: "01",
    href: "/hire",
    title: "Hire the House",
    copy: `Director's chair: ${FILM_FAMILY.ceo}. Photographers, editors, drone, sound — eight seats.`,
    tag: "Crew",
  },
  {
    slug: "02",
    href: "/rent",
    title: "Rental Bay",
    copy: "Camera 1 Sony FX3. Gimbals. Production cars. The same kit we trust on set.",
    tag: "Gear",
  },
  {
    slug: "03",
    href: "/sell",
    title: "Vault Sale",
    copy: "Cameras and lenses leaving rotation. Message Zulfikar for condition and price.",
    tag: "Glass",
  },
  {
    slug: "04",
    href: "/instagram",
    title: "Dailies Wall",
    copy: "Public Instagram — sort latest drops or famous frames. No login required.",
    tag: "Feed",
  },
];

export function HouseDirectory() {
  return (
    <section className="relative border-t border-white/5 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">
          ZH Film Family · Lot directory
        </p>
        <h2 className="mt-3 font-display text-4xl font-bold uppercase leading-none text-white sm:text-6xl">
          <SplitText text="One house. Many desks." inView />
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-zinc-400">
          Not a vendor list — a production lot. Walk the call sheet, rent the
          bay, or buy glass from the vault.
        </p>
        <Stagger className="mt-12 grid gap-5 md:grid-cols-2">
          {bays.map((b) => (
            <StaggerItem key={b.slug}>
              <TiltCard className="rounded-3xl">
                <Link
                  href={b.href}
                  data-cursor="Enter"
                  className="zh-callsheet group relative block h-full overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/40 p-8 transition-colors hover:border-zh-gold/40"
                >
                  <span className="pointer-events-none absolute -right-6 -top-10 font-display text-[9rem] font-bold leading-none text-white/[0.03] transition-colors duration-500 group-hover:text-zh-gold/10">
                    {b.slug}
                  </span>
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-zh-gold">
                      {b.slug}
                    </span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                      {b.tag}
                    </span>
                  </div>
                  <h3 className="relative mt-6 font-serif text-3xl text-white transition-colors group-hover:text-zh-gold">
                    {b.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {b.copy}
                  </p>
                  <p className="mt-6 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-zh-gold">
                    Enter bay{" "}
                    <span className="transition-transform duration-300 group-hover:translate-x-1.5">
                      →
                    </span>
                  </p>
                </Link>
              </TiltCard>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
