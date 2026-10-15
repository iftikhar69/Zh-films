import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSettings, saveSettings, settingsSchema } from "@/lib/settings";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.reason }, { status: gate.reason === "Admin access only" ? 403 : 401 });
  return NextResponse.json({ ok: true, settings: await getSettings() });
}

export async function PUT(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.reason }, { status: gate.reason === "Admin access only" ? 403 : 401 });
  const parsed = settingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ ok: false, error: `${issue?.path.join(".")}: ${issue?.message}` }, { status: 400 });
  }
  await saveSettings(parsed.data, gate.actor);
  return NextResponse.json({ ok: true, settings: parsed.data });
}
