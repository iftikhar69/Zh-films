import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const reel = await prisma.reel.update({
      where: { id },
      data: { views: { increment: 1 } },
      select: { views: true }
    });
    return NextResponse.json({ ok: true, views: reel.views });
  } catch {
    return NextResponse.json({ ok: false, error: "Reel not found" }, { status: 404 });
  }
}
