import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminGate } from "@/lib/auth";
import { deletePhotos } from "@/lib/galleries";

const patch = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  eventDate: z.string().trim().max(40).optional(),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(["active", "archived"]).optional(),
  allowDownloads: z.boolean().optional(),
  coverPhotoId: z.string().max(40).nullable().optional()
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const gate = await adminGate();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const parsed = patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message }, { status: 400 });
  if (parsed.data.coverPhotoId) {
    const photo = await prisma.familyPhoto.findFirst({ where: { id: parsed.data.coverPhotoId, galleryId: id }, select: { id: true } });
    if (!photo) return NextResponse.json({ ok: false, error: "That photo isn't in this gallery" }, { status: 400 });
  }
  const gallery = await prisma.familyGallery.update({ where: { id }, data: parsed.data }).catch(() => null);
  if (!gallery) return NextResponse.json({ ok: false, error: "Gallery not found" }, { status: 404 });
  return NextResponse.json({ ok: true, gallery });
}

/** Deletes the gallery, its member list and every stored file. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const gate = await adminGate();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const photos = await prisma.familyPhoto.findMany({ where: { galleryId: id }, select: { originalPath: true, displayPath: true, thumbPath: true } });
  try {
    await deletePhotos(photos);
  } catch (e) {
    console.error("[galleries] storage delete failed", e);
    return NextResponse.json({ ok: false, error: "Couldn't delete the stored photos. Nothing was removed — please try again." }, { status: 502 });
  }
  await prisma.familyGallery.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
