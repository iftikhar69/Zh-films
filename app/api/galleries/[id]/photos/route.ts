import { NextResponse } from "next/server";
import { getViewer, loadGalleryFor, signedPhotoPage } from "@/lib/galleries";

const PRIVATE = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401, headers: PRIVATE });
  const gallery = await loadGalleryFor(viewer, id);
  if (!gallery) return NextResponse.json({ ok: false, error: "Gallery not found" }, { status: 404, headers: PRIVATE });
  const cursor = new URL(req.url).searchParams.get("cursor");
  const page = await signedPhotoPage(gallery.id, cursor && cursor.length <= 40 ? cursor : null);
  return NextResponse.json({ ok: true, ...page }, { headers: PRIVATE });
}
