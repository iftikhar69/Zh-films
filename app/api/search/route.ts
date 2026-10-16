import { PUBLIC_GEAR_STATUSES } from "@/lib/gear";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type SearchHit = {
  id: string;
  group: "Reels" | "Film Family" | "Gear" | "Journal";
  title: string;
  subtitle: string;
  href: string;
  image?: string | null;
};

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ ok: true, q, hits: [] as SearchHit[] });

  const [reels, crew, gear, posts] = await Promise.all([
    prisma.reel.findMany({
      where: { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { category: { contains: q, mode: "insensitive" as const } }] },
      take: 6,
      orderBy: { views: "desc" }
    }),
    prisma.crewMember.findMany({
      where: { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { title: { contains: q, mode: "insensitive" as const } }, { role: { contains: q, mode: "insensitive" as const } }] },
      take: 4
    }),
    prisma.gearItem.findMany({
      where: {
        status: { in: PUBLIC_GEAR_STATUSES },
        OR: [{ name: { contains: q, mode: "insensitive" as const } }, { brand: { contains: q, mode: "insensitive" as const } }, { category: { contains: q, mode: "insensitive" as const } }]
      },
      take: 4
    }),
    prisma.journalPost.findMany({
      where: { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { excerpt: { contains: q, mode: "insensitive" as const } }] },
      take: 3
    })
  ]);

  const hits: SearchHit[] = [
    ...reels.map((r) => ({
      id: r.id,
      group: "Reels" as const,
      title: r.title,
      subtitle: `${r.category} · ${r.views.toLocaleString()} views`,
      href: `/reels?category=${r.category}`,
      image: r.thumbnail
    })),
    ...crew.map((c) => ({
      id: c.id,
      group: "Film Family" as const,
      title: c.name,
      subtitle: c.title,
      href: "/hire",
      image: c.image
    })),
    ...gear.map((g) => ({
      id: g.id,
      group: "Gear" as const,
      title: g.name,
      subtitle: `${g.brand} · ${g.priceLabel}`,
      href: g.listingType === "sell" ? "/sell" : "/rent",
      image: g.image
    })),
    ...posts.map((p) => ({
      id: p.id,
      group: "Journal" as const,
      title: p.title,
      subtitle: p.excerpt,
      href: `/journal/${p.slug}`,
      image: p.coverImage
    }))
  ];

  return NextResponse.json({ ok: true, q, hits });
}
