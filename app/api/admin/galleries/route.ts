import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminGate } from "@/lib/auth";

const create = z.object({
  title: z.string().trim().min(2, "Give the gallery a title").max(120),
  eventDate: z.string().trim().max(40).optional().default(""),
  description: z.string().trim().max(1000).optional().default("")
});

export async function GET() {
  const gate = await adminGate();
  if (!gate.ok) return gate.response;
  const galleries = await prisma.familyGallery.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { photos: true, members: true } } }
  });
  return NextResponse.json({ ok: true, galleries });
}

export async function POST(req: Request) {
  const gate = await adminGate();
  if (!gate.ok) return gate.response;
  const parsed = create.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message }, { status: 400 });
  const gallery = await prisma.familyGallery.create({ data: parsed.data });
  return NextResponse.json({ ok: true, gallery });
}
