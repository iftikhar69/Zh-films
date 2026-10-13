import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { JOURNAL_PAGE_SIZE } from "@/lib/constants";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const skip = (page - 1) * JOURNAL_PAGE_SIZE;

  const [total, items] = await Promise.all([
    prisma.journalPost.count(),
    prisma.journalPost.findMany({
      orderBy: { publishedAt: "desc" },
      skip,
      take: JOURNAL_PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true
      }
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / JOURNAL_PAGE_SIZE));

  return NextResponse.json({
    page,
    pageSize: JOURNAL_PAGE_SIZE,
    total,
    totalPages,
    hasMore: page < totalPages,
    items
  });
}
