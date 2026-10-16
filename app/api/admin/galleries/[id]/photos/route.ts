import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminGate } from "@/lib/auth";
import { addPhoto, deletePhotos, newUploadPath } from "@/lib/galleries";
import { StorageError, createSignedUploadUrl, downloadObject, removeObjects } from "@/lib/storage";

export const maxDuration = 26;

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("sign"), ext: z.enum(["jpg", "jpeg", "png", "webp"]) }),
  z.object({ action: z.literal("commit"), path: z.string().max(200) }),
  z.object({ action: z.literal("delete"), photoIds: z.array(z.string().max(40)).min(1).max(500) }),
  z.object({ action: z.literal("reorder"), photoIds: z.array(z.string().max(40)).min(1).max(2000) })
]);
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const gate = await adminGate();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const gallery = await prisma.familyGallery.findUnique({ where: { id }, select: { id: true } });
  if (!gallery) return NextResponse.json({ ok: false, error: "Gallery not found" }, { status: 404 });
  const input = parsed.data;

  try {
    if (input.action === "sign") {
      // The browser uploads the original straight to private storage; it never passes through a public URL.
      const path = newUploadPath(id, input.ext === "jpeg" ? "jpg" : input.ext);
      return NextResponse.json({ ok: true, path, uploadUrl: await createSignedUploadUrl("family", path) });
    }
    if (input.action === "commit") {
      if (!input.path.startsWith(`galleries/${id}/original/`)) {
        return NextResponse.json({ ok: false, error: "That upload doesn't belong to this gallery" }, { status: 400 });
      }
      const bytes = await downloadObject("family", input.path);
      try {
        const photo = await addPhoto(id, bytes, { source: "upload", originalPath: input.path });
        return NextResponse.json({ ok: true, photo: { id: photo.id } });
      } catch (e) {
        await removeObjects("family", [input.path]).catch(() => {});
        return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Couldn't process this image" }, { status: 400 });
      }
    }
    if (input.action === "delete") {
      const photos = await prisma.familyPhoto.findMany({ where: { galleryId: id, id: { in: input.photoIds } } });
      await deletePhotos(photos);
      await prisma.familyPhoto.deleteMany({ where: { galleryId: id, id: { in: photos.map((p) => p.id) } } });
      await prisma.familyGallery.updateMany({ where: { id, coverPhotoId: { in: photos.map((p) => p.id) } }, data: { coverPhotoId: null } });
      return NextResponse.json({ ok: true, deleted: photos.length });
    }
    await prisma.$transaction(
      input.photoIds.map((photoId, i) => prisma.familyPhoto.updateMany({ where: { id: photoId, galleryId: id }, data: { sortOrder: i + 1 } }))
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof StorageError) {
      console.error("[galleries] storage", e.message);
      return NextResponse.json({ ok: false, error: "Storage is unavailable right now. Please try again." }, { status: 502 });
    }
    throw e;
  }
}
