import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminGate } from "@/lib/auth";
import { normalizeEmail } from "@/lib/galleries";

const body = z.object({ email: z.string().trim().email("Enter a valid email").max(200) });
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const gate = await adminGate();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message }, { status: 400 });
  const gallery = await prisma.familyGallery.findUnique({ where: { id }, select: { id: true } });
  if (!gallery) return NextResponse.json({ ok: false, error: "Gallery not found" }, { status: 404 });
  const email = normalizeEmail(parsed.data.email);
  const member = await prisma.familyGalleryMember.upsert({
    where: { galleryId_email: { galleryId: id, email } },
    create: { galleryId: id, email, addedBy: gate.actor },
    update: {}
  });
  return NextResponse.json({ ok: true, member });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const gate = await adminGate();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message }, { status: 400 });
  await prisma.familyGalleryMember.deleteMany({ where: { galleryId: id, email: normalizeEmail(parsed.data.email) } });
  return NextResponse.json({ ok: true });
}
