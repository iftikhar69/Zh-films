import { NextResponse } from "next/server";
import { getMostLovedReels } from "@/lib/queries";

export async function GET(req: Request) {
  const limit = Math.min(12, Math.max(1, Number(new URL(req.url).searchParams.get("limit") ?? "6") || 6));
  const items = await getMostLovedReels(limit);
  return NextResponse.json({ ok: true, items });
}
