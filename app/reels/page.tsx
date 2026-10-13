import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { REELS_PAGE_SIZE, REEL_CATEGORIES, type ReelCategory } from "@/lib/constants";
import { ReelsVault } from "@/components/reels/ReelsVault";
import { buildPageMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Reel Vault",
  description:
    "Paginated cinematic reels by ZH Films — weddings, pre-events, AKU, and commercial films directed by Zulfikar Hussain.",
  path: "/reels"
});

type Props = { searchParams: Promise<{ page?: string; category?: string }> };

export default async function ReelsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const raw = (sp.category ?? "all").toLowerCase();
  const category = (REEL_CATEGORIES.includes(raw as ReelCategory) ? raw : "all") as ReelCategory;
  const where = category === "all" ? {} : { category };

  const [items, total] = await Promise.all([
    prisma.reel.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * REELS_PAGE_SIZE,
      take: REELS_PAGE_SIZE
    }),
    prisma.reel.count({ where })
  ]);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Reel Vault", path: "/reels" }
        ])}
      />
      <ReelsVault key={`${category}-${page}`} initial={items} total={total} category={category} page={page} />
    </>
  );
}
