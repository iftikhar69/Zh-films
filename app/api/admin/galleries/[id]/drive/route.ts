import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminGate } from "@/lib/auth";
import { addPhoto } from "@/lib/galleries";
import { downloadPublicFile, driveFolderId, listPublicFolder } from "@/lib/drive";

export const maxDuration = 26;

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list"), folder: z.string().trim().max(300) }),
  z.object({ action: z.literal("import"), fileId: z.string().regex(/^[A-Za-z0-9_-]{10,100}$/) })
]);
type Ctx = { params: Promise<{ id: string }> };

/** Imports one file per request so each call stays well inside the host's function time limit. */
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
    if (input.action === "list") {
      const folderId = driveFolderId(input.folder);
      if (!folderId) return NextResponse.json({ ok: false, error: "Paste a Google Drive folder link" }, { status: 400 });
      const files = await listPublicFolder(folderId);
      const done = await prisma.familyPhoto.findMany({
        where: { galleryId: id, sourceId: { in: files.map((f) => f.id) } },
        select: { sourceId: true }
      });
      const imported = new Set(done.map((d) => d.sourceId));
      return NextResponse.json({ ok: true, files: files.map((f) => ({ ...f, imported: imported.has(f.id) })) });
    }
    const existing = await prisma.familyPhoto.findFirst({ where: { galleryId: id, sourceId: input.fileId }, select: { id: true } });
    if (existing) return NextResponse.json({ ok: true, photo: existing, skipped: true });
    const bytes = await downloadPublicFile(input.fileId);
    const photo = await addPhoto(id, bytes, { source: "drive", sourceId: input.fileId });
    return NextResponse.json({ ok: true, photo: { id: photo.id } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Import failed" }, { status: 502 });
  }
}
