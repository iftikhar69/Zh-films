import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { REELS_PAGE_SIZE, REEL_CATEGORIES } from "@/lib/constants";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const category = (searchParams.get("category") ?? "all").toLowerCase();
  const skip = (page - 1) * REELS_PAGE_SIZE;

  const where =
    category !== "all" && REEL_CATEGORIES.includes(category as never) ? { category } : {};

  const [total, items] = await Promise.all([
    prisma.reel.count({ where }),
    prisma.reel.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: REELS_PAGE_SIZE
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / REELS_PAGE_SIZE));

  return NextResponse.json({
    page,
    pageSize: REELS_PAGE_SIZE,
    total,
    totalPages,
    hasMore: page < totalPages,
    category,
    items
  });
}
