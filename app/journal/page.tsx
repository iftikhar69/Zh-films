import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { JOURNAL_PAGE_SIZE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { buildPageMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Film Notes",
  description:
    "Paginated journal from ZH Films — cinematic craft, AKU coverage, grading, and director notes by Zulfikar Hussain.",
  path: "/journal"
});

type Props = { searchParams: Promise<{ page?: string }> };

export default async function JournalPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const skip = (page - 1) * JOURNAL_PAGE_SIZE;

  const [total, posts] = await Promise.all([
    prisma.journalPost.count(),
    prisma.journalPost.findMany({
      orderBy: { publishedAt: "desc" },
      skip,
      take: JOURNAL_PAGE_SIZE,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true
      }
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / JOURNAL_PAGE_SIZE));

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Journal", path: "/journal" }
        ])}
      />
      <header className="mb-10 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.4em] text-zh-gold/80">Film notes</p>
        <h1 className="mt-3 font-serif text-3xl text-white sm:text-4xl">Journal</h1>
        <p className="mt-3 text-sm text-zinc-400">
          Paginated essays from set — no endless scroll, just deliberate chapters you can return to like a script.
        </p>
      </header>

      <div className="space-y-6">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/journal/${p.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 shadow-[0_0_60px_rgba(0,0,0,0.55)] transition hover:border-zh-gold/40 sm:flex-row"
          >
            {p.coverImage && (
              <div className="relative aspect-[16/10] sm:w-72 sm:shrink-0">
                <Image
                  src={p.coverImage}
                  alt={p.title}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-[1.03]"
                  sizes="(max-width:640px) 100vw, 288px"
                />
              </div>
            )}
            <div className="flex flex-1 flex-col justify-center p-6">
              <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                {p.publishedAt.toLocaleDateString()}
              </p>
              <h2 className="mt-2 font-serif text-xl text-white sm:text-2xl">{p.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-zinc-400">{p.excerpt}</p>
              <span className="mt-4 text-xs uppercase tracking-[0.3em] text-zh-gold">Read scene →</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: totalPages }).map((_, idx) => {
          const p = idx + 1;
          return (
            <Link
              key={p}
              href={`/journal?page=${p}`}
              scroll={false}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border text-xs transition",
                p === page
                  ? "border-zh-gold/70 bg-zh-gold text-black shadow-[0_0_24px_rgba(200,169,106,0.35)]"
                  : "border-white/10 text-zinc-300 hover:border-zh-gold/40 hover:text-white"
              )}
            >
              {p}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
