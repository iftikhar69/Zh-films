import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { adminGate } from "@/lib/auth";
import { gearInput, slugify } from "@/lib/gear";

export async function GET() {
  const gate = await adminGate();
  if (!gate.ok) return gate.response;
  const items = await prisma.gearItem.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const gate = await adminGate();
  if (!gate.ok) return gate.response;
  const parsed = gearInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message, field: parsed.error.issues[0]?.path[0] }, { status: 400 });
  const d = parsed.data;
  const item = await prisma.gearItem.create({
    data: { ...d, slug: `${slugify(d.name)}-${randomBytes(3).toString("hex")}`, image: "", available: d.status === "available" }
  });
  return NextResponse.json({ ok: true, item });
}
