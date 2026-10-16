import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TEAM_ID } from "@/lib/booking-rules";
import { BlockConflictError, blockDates } from "@/lib/booking-availability";

const createSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a start date"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an end date"),
  reason: z.string().max(200).optional(),
  force: z.boolean().optional()
});

async function gate() {
  const g = await requireAdmin();
  if (g.ok) return { ok: true as const, actor: g.actor };
  return { ok: false as const, res: NextResponse.json({ ok: false, error: g.reason }, { status: g.reason === "Admin access only" ? 403 : 401 }) };
}

export async function POST(req: Request) {
  const g = await gate();
  if (!g.ok) return g.res;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid dates" }, { status: 400 });
  try {
    const row = await blockDates({ ...parsed.data, createdBy: g.actor });
    return NextResponse.json({ ok: true, block: row });
  } catch (e) {
    if (e instanceof BlockConflictError) {
      return NextResponse.json({ ok: false, code: "booking_conflict", error: e.message, bookings: e.bookings }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Could not save" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const g = await gate();
  if (!g.ok) return g.res;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  const res = await prisma.blockedDate.deleteMany({ where: { id, teamId: TEAM_ID } });
  if (!res.count) return NextResponse.json({ ok: false, error: "That block was already removed." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
