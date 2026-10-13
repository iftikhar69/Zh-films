import { prisma } from "@/lib/prisma";
import type { Reel } from "@prisma/client";

export type LovedReel = Reel & { loves: number };

export async function getMostLovedReels(limit = 6): Promise<LovedReel[]> {
  const grouped = await prisma.favorite.groupBy({
    by: ["itemId"],
    where: { itemType: "reel" },
    _count: { itemId: true },
    orderBy: { _count: { itemId: "desc" } },
    take: limit
  });
  if (!grouped.length) return [];
  const reels = await prisma.reel.findMany({ where: { id: { in: grouped.map((g) => g.itemId) } } });
  const byId = new Map(reels.map((r) => [r.id, r]));
  return grouped
    .map((g) => {
      const reel = byId.get(g.itemId);
      return reel ? { ...reel, loves: g._count.itemId } : null;
    })
    .filter((r): r is LovedReel => r !== null);
}

export async function getLoveCounts(itemType: string, ids: string[]) {
  if (!ids.length) return {} as Record<string, number>;
  const grouped = await prisma.favorite.groupBy({
    by: ["itemId"],
    where: { itemType, itemId: { in: ids } },
    _count: { itemId: true }
  });
  return Object.fromEntries(grouped.map((g) => [g.itemId, g._count.itemId])) as Record<string, number>;
}

export async function getReviewStats() {
  const agg = await prisma.review.aggregate({
    where: { approved: true },
    _avg: { rating: true },
    _count: { _all: true }
  });
  return { average: agg._avg.rating ?? 0, count: agg._count._all };
}
