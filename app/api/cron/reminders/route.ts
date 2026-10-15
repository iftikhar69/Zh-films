import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** Called by Vercel Cron (sends `Authorization: Bearer $CRON_SECRET`) or any external scheduler. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const result = await runReminders();
  return NextResponse.json({ ok: true, ...result });
}
