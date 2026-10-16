import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminGate } from "@/lib/auth";
import { gearInput } from "@/lib/gear";
import { removeGearImages } from "@/lib/gear-images";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const gate = await adminGate();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const parsed = gearInput.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message, field: parsed.error.issues[0]?.path[0] }, { status: 400 });
  const current = await prisma.gearItem.findUnique({ where: { id }, select: { image: true } });
  if (!current) return NextResponse.json({ ok: false, error: "Listing not found" }, { status: 404 });
  const status = parsed.data.status;
  if (status && status !== "draft" && !current.image) {
    return NextResponse.json({ ok: false, error: "Add a photo before publishing this listing.", field: "status" }, { status: 400 });
  }
  const item = await prisma.gearItem.update({
    where: { id },
    data: { ...parsed.data, ...(status ? { available: status === "available" } : {}) }
  });
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const gate = await adminGate();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const item = await prisma.gearItem.findUnique({ where: { id }, select: { imagePaths: true } });
  if (!item) return NextResponse.json({ ok: false, error: "Listing not found" }, { status: 404 });
  await removeGearImages(item.imagePaths).catch((e) => console.error("[gear] image delete failed", e));
  await prisma.gearItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
