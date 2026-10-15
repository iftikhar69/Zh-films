import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { catalogSchema, getCatalog, saveCatalog } from "@/lib/catalog";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.reason }, { status: gate.reason === "Admin access only" ? 403 : 401 });
  return NextResponse.json({ ok: true, catalog: await getCatalog() });
}

export async function PUT(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.reason }, { status: gate.reason === "Admin access only" ? 403 : 401 });
  const parsed = catalogSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ ok: false, error: `${issue?.path.join(".") || "catalog"}: ${issue?.message}` }, { status: 400 });
  }
  await saveCatalog(parsed.data, gate.actor);
  return NextResponse.json({ ok: true, catalog: parsed.data });
}
