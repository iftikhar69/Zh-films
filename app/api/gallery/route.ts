import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GALLERY_PAGE_SIZE } from "@/lib/constants";

const VALID_CATEGORIES = new Set(["weddings", "aku", "commercial", "pre-events"]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const category = (searchParams.get("category") ?? "all").toLowerCase();
  const skip = (page - 1) * GALLERY_PAGE_SIZE;

  const where =
    category && category !== "all" && VALID_CATEGORIES.has(category) ? { category } : {};

  const [total, items] = await Promise.all([
    prisma.galleryItem.count({ where }),
    prisma.galleryItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: GALLERY_PAGE_SIZE
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE));

  return NextResponse.json({
    page,
    pageSize: GALLERY_PAGE_SIZE,
    total,
    totalPages,
    hasMore: page < totalPages,
    category,
    items
  });
}
