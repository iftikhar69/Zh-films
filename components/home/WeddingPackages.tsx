import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getCatalog, publicCatalog } from "@/lib/catalog";
import { PackageCards, PackagesFinePrint } from "@/components/packages/PackageCards";

export async function WeddingPackages() {
  const { packages } = publicCatalog(await getCatalog());
  return (
    <section id="packages" aria-labelledby="packages-heading" className="relative border-t border-white/5 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-3 text-xs uppercase tracking-[0.45em] text-zh-gold/80">
              <span className="h-px w-10 bg-zh-gold/60" />
              Wedding packages
            </p>
            <h2 id="packages-heading" className="mt-4 font-display text-[clamp(2.2rem,5.5vw,4.5rem)] font-bold uppercase leading-[0.92] text-white">
              Choose your <span className="zh-text-outline">cut.</span>
            </h2>
          </div>
          <Link
            href="/book/event"
            className="group inline-flex items-center gap-2 self-start rounded-full border border-white/15 px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-zinc-300 transition hover:border-zh-gold/50 hover:text-zh-gold sm:self-auto"
          >
            Not a wedding? Book an event in advance
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="mt-10">
          <PackageCards packages={packages} />
        </div>
        <PackagesFinePrint />
      </div>
    </section>
  );
}
