import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminGate } from "@/lib/auth";
import { setGearImage } from "@/lib/gear-images";
import { createSignedUploadUrl, downloadObject, removeObjects } from "@/lib/storage";

export const maxDuration = 26;

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("sign"), ext: z.enum(["jpg", "jpeg", "png", "webp"]) }),
  z.object({ action: z.literal("commit"), path: z.string().max(200) })
]);
type Ctx = { params: Promise<{ id: string }> };

/** Upload or replace a listing photo: the raw file lands in private storage, only resized copies go public. */
export async function POST(req: Request, { params }: Ctx) {
  const gate = await adminGate();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  const item = await prisma.gearItem.findUnique({ where: { id }, select: { id: true } });
  if (!item) return NextResponse.json({ ok: false, error: "Listing not found" }, { status: 404 });
  const prefix = `incoming/gear/${id}/`;
  try {
    if (parsed.data.action === "sign") {
      const ext = parsed.data.ext === "jpeg" ? "jpg" : parsed.data.ext;
      const path = `${prefix}${randomBytes(8).toString("hex")}.${ext}`;
      return NextResponse.json({ ok: true, path, uploadUrl: await createSignedUploadUrl("originals", path) });
    }
    if (!parsed.data.path.startsWith(prefix)) return NextResponse.json({ ok: false, error: "That upload doesn't belong to this listing" }, { status: 400 });
    const bytes = await downloadObject("originals", parsed.data.path);
    try {
      await setGearImage(id, bytes);
    } finally {
      await removeObjects("originals", [parsed.data.path]).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
