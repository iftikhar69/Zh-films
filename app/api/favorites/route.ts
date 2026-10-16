import { PUBLIC_GEAR_STATUSES } from "@/lib/gear";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/viewer";
import { FAVORITE_TYPES, favoriteKey, type FavoriteCard, type FavoriteType } from "@/lib/favorites";

const toggleSchema = z.object({
  type: z.enum(FAVORITE_TYPES),
  id: z.string().min(1).max(64)
});

async function itemExists(type: FavoriteType, id: string) {
  switch (type) {
    case "reel":
      return Boolean(await prisma.reel.findUnique({ where: { id }, select: { id: true } }));
    case "gallery":
      return Boolean(await prisma.galleryItem.findUnique({ where: { id }, select: { id: true } }));
    case "crew":
      return Boolean(await prisma.crewMember.findFirst({ where: { id, published: true }, select: { id: true } }));
    case "gear":
      return Boolean(await prisma.gearItem.findFirst({ where: { id, status: { in: PUBLIC_GEAR_STATUSES } }, select: { id: true } }));
  }
}

async function buildCards(rows: { itemType: string; itemId: string; createdAt: Date }[]) {
  const ids = (t: FavoriteType) => rows.filter((r) => r.itemType === t).map((r) => r.itemId);
  const [reels, gallery, crew, gear] = await Promise.all([
    prisma.reel.findMany({ where: { id: { in: ids("reel") } } }),
    prisma.galleryItem.findMany({ where: { id: { in: ids("gallery") } } }),
    prisma.crewMember.findMany({ where: { id: { in: ids("crew") }, published: true } }),
    prisma.gearItem.findMany({ where: { id: { in: ids("gear") }, status: { in: PUBLIC_GEAR_STATUSES } } })
  ]);

  const lookup = new Map<string, Omit<FavoriteCard, "savedAt">>();
  for (const r of reels)
    lookup.set(favoriteKey("reel", r.id), {
      key: favoriteKey("reel", r.id),
      type: "reel",
      id: r.id,
      title: r.title,
      subtitle: `${r.category} · ${Math.floor(r.durationSec / 60)}:${String(r.durationSec % 60).padStart(2, "0")}`,
      image: r.thumbnail,
      href: `/reels?category=${r.category}`
    });
  for (const g of gallery)
    lookup.set(favoriteKey("gallery", g.id), {
      key: favoriteKey("gallery", g.id),
      type: "gallery",
      id: g.id,
      title: g.title,
      subtitle: `${g.category} · ${g.mediaType}`,
      image: g.thumbnail ?? g.url,
      href: `/gallery?category=${g.category}`
    });
  for (const c of crew)
    lookup.set(favoriteKey("crew", c.id), {
      key: favoriteKey("crew", c.id),
      type: "crew",
      id: c.id,
      title: c.name,
      subtitle: c.title,
      image: c.image,
      href: "/hire"
    });
  for (const g of gear)
    lookup.set(favoriteKey("gear", g.id), {
      key: favoriteKey("gear", g.id),
      type: "gear",
      id: g.id,
      title: g.name,
      subtitle: `${g.brand} · ${g.priceLabel}`,
      image: g.image,
      href: g.listingType === "sell" ? "/sell" : "/rent"
    });

  return rows
    .map((r) => {
      const card = lookup.get(`${r.itemType}:${r.itemId}`);
      return card ? { ...card, savedAt: r.createdAt.toISOString() } : null;
    })
    .filter((c): c is FavoriteCard => c !== null);
}

export async function GET(req: Request) {
  const expand = new URL(req.url).searchParams.get("expand") === "1";
  const viewer = await getViewer({ create: false });
  if (!viewer) return NextResponse.json({ ok: true, signedIn: false, keys: [], cards: [] });

  const rows = await prisma.favorite.findMany({
    where: { ownerId: viewer.ownerId },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({
    ok: true,
    signedIn: viewer.signedIn,
    keys: rows.map((r) => `${r.itemType}:${r.itemId}`),
    cards: expand ? await buildCards(rows) : undefined
  });
}

export async function POST(req: Request) {
  const parsed = toggleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Unknown item" }, { status: 400 });
  }
  const { type, id } = parsed.data;
  if (!(await itemExists(type, id))) {
    return NextResponse.json({ ok: false, error: "That item is no longer on the lot" }, { status: 404 });
  }

  const viewer = await getViewer({ create: true });
  if (!viewer) return NextResponse.json({ ok: false, error: "Could not identify you" }, { status: 400 });

  const where = { ownerId_itemType_itemId: { ownerId: viewer.ownerId, itemType: type, itemId: id } };
  const existing = await prisma.favorite.findUnique({ where });
  if (existing) await prisma.favorite.delete({ where });
  else await prisma.favorite.create({ data: { ownerId: viewer.ownerId, itemType: type, itemId: id } });

  const count = await prisma.favorite.count({ where: { itemType: type, itemId: id } });
  return NextResponse.json({ ok: true, favorited: !existing, count });
}

export async function DELETE() {
  const viewer = await getViewer({ create: false });
  if (viewer) await prisma.favorite.deleteMany({ where: { ownerId: viewer.ownerId } });
  return NextResponse.json({ ok: true });
}
