import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getReviewStats } from "@/lib/queries";

const schema = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(60),
  eventType: z.string().trim().min(2, "What did we film?").max(40),
  rating: z.number().int().min(1).max(5),
  message: z.string().trim().min(20, "A few more words, please (20+ characters)").max(600)
});

export async function GET() {
  const [items, stats] = await Promise.all([
    prisma.review.findMany({ where: { approved: true }, orderBy: { createdAt: "desc" }, take: 30 }),
    getReviewStats()
  ]);
  return NextResponse.json({ ok: true, items, stats });
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid review" },
      { status: 400 }
    );
  }
  const review = await prisma.review.create({ data: parsed.data });
  const stats = await getReviewStats();
  return NextResponse.json({ ok: true, review, stats });
}
