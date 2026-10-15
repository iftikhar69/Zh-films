import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { readReceipt } from "@/lib/receipts";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.reason }, { status: gate.reason === "Admin access only" ? 403 : 401 });
  const { id } = await params;
  const payment = await prisma.payment.findUnique({ where: { id }, select: { receiptPath: true, receiptMime: true } });
  if (!payment?.receiptPath || !payment.receiptMime) return NextResponse.json({ ok: false, error: "No receipt" }, { status: 404 });
  try {
    const bytes = await readReceipt(payment.receiptPath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": payment.receiptMime,
        "Content-Disposition": `inline; filename="receipt-${id}.${payment.receiptPath.split(".").pop()}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox"
      }
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Receipt file missing" }, { status: 404 });
  }
}
