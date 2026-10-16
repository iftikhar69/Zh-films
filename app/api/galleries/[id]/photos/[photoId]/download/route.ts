import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewer, loadGalleryFor } from "@/lib/galleries";
import { signedUrl } from "@/lib/storage";

const PRIVATE = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };

/** Original-resolution download: members only, and only when the owner enabled downloads. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  const { id, photoId } = await params;
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401, headers: PRIVATE });
  const gallery = await loadGalleryFor(viewer, id);
  if (!gallery) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404, headers: PRIVATE });
  if (!gallery.allowDownloads && !viewer.isAdmin) {
    return NextResponse.json({ ok: false, error: "Downloads aren't enabled for this gallery" }, { status: 403, headers: PRIVATE });
  }
  const photo = await prisma.familyPhoto.findFirst({ where: { id: photoId, galleryId: gallery.id }, select: { originalPath: true } });
  if (!photo) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404, headers: PRIVATE });
  const ext = photo.originalPath.split(".").pop();
  const url = await signedUrl("family", photo.originalPath, 120, `ZH-Films-${photoId}.${ext}`);
  if (!url) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404, headers: PRIVATE });
  return NextResponse.redirect(url, { status: 302, headers: PRIVATE });
}
