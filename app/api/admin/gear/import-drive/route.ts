import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminGate } from "@/lib/auth";
import { downloadPublicFile, driveFolderId, listPublicFolder } from "@/lib/drive";
import { setGearImage } from "@/lib/gear-images";
import { draftName } from "@/lib/gear";

export const maxDuration = 26;

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list"), folder: z.string().trim().max(300) }),
  z.object({ action: z.literal("import"), fileId: z.string().regex(/^[A-Za-z0-9_-]{10,100}$/), name: z.string().max(400) })
]);

/** Each imported photo becomes a hidden draft listing (no price, no specs) for the owner to complete. */
export async function POST(req: Request) {
  const gate = await adminGate();
  if (!gate.ok) return gate.response;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  try {
    if (parsed.data.action === "list") {
      const folderId = driveFolderId(parsed.data.folder);
      if (!folderId) return NextResponse.json({ ok: false, error: "Paste a Google Drive folder link" }, { status: 400 });
      const files = await listPublicFolder(folderId);
      const done = await prisma.gearItem.findMany({ where: { slug: { in: files.map((f) => `drive-${f.id.toLowerCase()}`) } }, select: { slug: true } });
      const imported = new Set(done.map((d) => d.slug));
      return NextResponse.json({ ok: true, files: files.map((f) => ({ ...f, imported: imported.has(`drive-${f.id.toLowerCase()}`) })) });
    }
    const slug = `drive-${parsed.data.fileId.toLowerCase()}`;
    const existing = await prisma.gearItem.findUnique({ where: { slug }, select: { id: true } });
    if (existing) return NextResponse.json({ ok: true, skipped: true });
    const bytes = await downloadPublicFile(parsed.data.fileId);
    const item = await prisma.gearItem.create({
      data: {
        slug,
        name: draftName(parsed.data.name),
        brand: "",
        category: "other",
        listingType: "sell",
        status: "draft",
        priceLabel: "",
        description: "",
        image: "",
        available: false
      }
    });
    try {
      await setGearImage(item.id, bytes);
    } catch (e) {
      await prisma.gearItem.delete({ where: { id: item.id } });
      throw e;
    }
    return NextResponse.json({ ok: true, id: item.id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Import failed" }, { status: 502 });
  }
}
