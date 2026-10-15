import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { adminPageGuard } from "@/lib/admin-guard";
import { formatInstant, formatPkr } from "@/lib/notify";
import { EmptyState, PaymentRecordBadge } from "@/components/admin/Badges";
import { PaymentReview } from "@/components/admin/PaymentReview";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "submitted", label: "Awaiting verification" },
  { key: "verified", label: "Verified" },
  { key: "rejected", label: "Rejected" }
] as const;

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await adminPageGuard("/admin/payments");
  const sp = await searchParams;
  const status = TABS.some((t) => t.key === sp.status) ? sp.status! : "submitted";
  const [payments, awaitingAdvance] = await Promise.all([
    prisma.payment.findMany({
      where: { status },
      include: { booking: { select: { id: true, names: true, confirmationCode: true, eventDate: true, advanceAmount: true } } },
      orderBy: { createdAt: status === "submitted" ? "asc" : "desc" },
      take: 200
    }),
    prisma.booking.findMany({
      where: { paymentStatus: "awaiting", status: { in: ["pending", "confirmed"] } },
      select: { id: true, names: true, eventDate: true, advanceAmount: true },
      orderBy: { eventDate: "asc" },
      take: 50
    })
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-white sm:text-4xl">Payments</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Customers report Easypaisa or bank transfers here. Nothing is marked received until you check your account and verify it.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/payments?status=${t.key}`}
            className={cn(
              "rounded-full border px-4 py-2 text-xs",
              status === t.key ? "border-zh-gold/60 bg-zh-gold/15 text-zh-gold" : "border-white/10 text-zinc-400"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {payments.length === 0 ? (
        <EmptyState title={status === "submitted" ? "No payments waiting" : `No ${status} payments`} />
      ) : (
        <ul className="space-y-2">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/bookings/${p.booking.id}#payments`} className="text-white hover:text-zh-gold">
                    {p.booking.names}
                  </Link>
                  <PaymentRecordBadge status={p.status} />
                </div>
                <p className="mt-1 text-sm text-zh-gold">
                  {formatPkr(p.amount)} <span className="text-xs text-zinc-500">of {formatPkr(p.booking.advanceAmount)} advance</span>
                </p>
                <p className="mt-1 font-mono text-xs text-zinc-400">
                  {p.method} · ref {p.reference} · {p.booking.confirmationCode} · event {p.booking.eventDate}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Submitted {formatInstant(p.createdAt)}
                  {p.verifiedAt ? ` · ${p.status} ${formatInstant(p.verifiedAt)} by ${p.verifiedBy}` : ""}
                </p>
                {p.receiptPath ? (
                  <a href={`/api/admin/payments/${p.id}/receipt`} target="_blank" rel="noreferrer" className="text-xs text-zh-gold hover:underline">
                    View receipt
                  </a>
                ) : (
                  <span className="text-xs text-zinc-600">No receipt uploaded</span>
                )}
              </div>
              {p.status === "submitted" ? (
                <PaymentReview paymentId={p.id} amount={formatPkr(p.amount)} reference={p.reference} method={p.method} />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <section className="space-y-2">
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-zinc-400">Advance requested, nothing reported yet</h2>
        {awaitingAdvance.length === 0 ? (
          <p className="text-sm text-zinc-500">None.</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {awaitingAdvance.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/bookings/${b.id}`} className="flex justify-between rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
                  <span className="text-zinc-200">{b.names} · {b.eventDate}</span>
                  <span className="text-zinc-400">{formatPkr(b.advanceAmount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
