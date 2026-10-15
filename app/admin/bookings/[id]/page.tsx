import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { adminPageGuard } from "@/lib/admin-guard";
import { getSettings } from "@/lib/settings";
import { SERVICES } from "@/lib/booking-rules";
import { isHeld } from "@/lib/booking-status";
import { formatInstant, formatPkr } from "@/lib/notify";
import { BookingActions } from "@/components/admin/BookingActions";
import { PaymentReview } from "@/components/admin/PaymentReview";
import { EmptyState, PaymentBadge, PaymentRecordBadge, StatusBadge } from "@/components/admin/Badges";

export const dynamic = "force-dynamic";

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await adminPageGuard(`/admin/bookings/${id}`);
  const [b, settings] = await Promise.all([
    prisma.booking.findUnique({
      where: { id },
      include: { payments: { orderBy: { createdAt: "desc" } }, events: { orderBy: { createdAt: "desc" } } }
    }),
    getSettings()
  ]);
  if (!b) notFound();

  const now = new Date();
  const held = isHeld(b, now);
  const service = SERVICES[b.serviceType as keyof typeof SERVICES];
  const overlapping =
    b.blockStart && b.blockEnd && (b.status === "pending" || b.status === "confirmed")
      ? await prisma.booking.findMany({
          where: {
            id: { not: b.id },
            teamId: b.teamId,
            blockStart: { lt: b.blockEnd },
            blockEnd: { gt: b.blockStart },
            status: { in: ["pending", "confirmed", "completed"] }
          },
          select: { id: true, names: true, status: true, startTime: true, endTime: true, holdExpiresAt: true }
        })
      : [];
  const verified = b.payments.filter((p) => p.status === "verified").reduce((n, p) => n + p.amount, 0);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/bookings" className="text-xs text-zinc-500 hover:text-zh-gold">
          ← All bookings
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl text-white">{b.names}</h1>
          <StatusBadge status={b.status} holdExpiresAt={b.holdExpiresAt} />
          <PaymentBadge status={b.paymentStatus} />
        </div>
        <p className="mt-1 font-mono text-xs text-zh-gold">{b.confirmationCode}</p>
        {held && b.holdExpiresAt ? (
          <p className="mt-2 text-sm text-fuchsia-300">
            Held until {formatInstant(b.holdExpiresAt)} {b.heldBy ? `by ${b.heldBy}` : ""}
          </p>
        ) : b.status === "pending" && b.holdExpiresAt ? (
          <p className="mt-2 text-sm text-zinc-500">Previous hold expired {formatInstant(b.holdExpiresAt)}.</p>
        ) : null}
      </div>

      {overlapping.length ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100">
          <p className="font-medium">Overlaps with {overlapping.length} other booking(s) on this time (including setup/travel):</p>
          <ul className="mt-2 space-y-1">
            {overlapping.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/bookings/${o.id}`} className="underline-offset-2 hover:underline">
                  {o.names}
                </Link>{" "}
                · {o.startTime}–{o.endTime} · {isHeld(o, now) ? "on hold" : o.status}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <BookingActions
        bookingId={b.id}
        status={b.status}
        held={held}
        eventEnded={!!b.endsAt && b.endsAt <= now}
        defaultHoldHours={settings.holds.defaultHours}
        quotedAmount={b.quotedAmount}
        advanceAmount={b.advanceAmount}
        defaultAdvancePercent={settings.advance.defaultPercent}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Event">
          <Row label="Service">{service?.label ?? b.serviceType}</Row>
          <Row label="Date">{b.eventDate}</Row>
          <Row label="Time">{b.startTime ? `${b.startTime}–${b.endTime} (Pakistan time)` : "Full day"}</Row>
          {service ? (
            <Row label="Crew blocked">
              {service.bufferBeforeMin} min before, {service.bufferAfterMin} min after
            </Row>
          ) : null}
          <Row label="Location">{b.city}</Row>
          <Row label="Coverage">{b.coverage}</Row>
          <Row label="Deliverables">{b.deliverables}</Row>
          {b.references ? <Row label="References">{b.references}</Row> : null}
          {b.notes ? <Row label="Notes">{b.notes}</Row> : null}
        </Card>
        <Card title="Client">
          <Row label="Name">{b.names}</Row>
          <Row label="Email">
            <a href={`mailto:${b.email}`} className="text-zh-gold hover:underline">
              {b.email}
            </a>
          </Row>
          <Row label="Phone">
            <a href={`tel:${b.phone}`} className="text-zh-gold hover:underline">
              {b.phone}
            </a>{" "}
            ·{" "}
            <a
              href={`https://wa.me/${b.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="text-zh-gold hover:underline"
            >
              WhatsApp
            </a>
          </Row>
          <Row label="Account">{b.clerkUserId ? "Signed-in customer" : "Guest request"}</Row>
          <Row label="Received">{formatInstant(b.createdAt)}</Row>
        </Card>
      </div>

      <section id="payments" className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-zinc-400">Payments</h2>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Agreed total" value={formatPkr(b.quotedAmount)} />
          <Stat label="Advance required" value={formatPkr(b.advanceAmount)} />
          <Stat label="Verified so far" value={formatPkr(verified)} />
        </div>
        {b.payments.length === 0 ? (
          <EmptyState title="No payments reported">
            {b.advanceAmount ? "The client can submit a reference from their booking page." : "Save a quote with an advance to show the client payment instructions."}
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {b.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white">{formatPkr(p.amount)}</span>
                    <PaymentRecordBadge status={p.status} />
                  </div>
                  <p className="mt-1 font-mono text-xs text-zinc-400">
                    {p.method} · ref {p.reference}
                    {p.payerName ? ` · ${p.payerName}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Submitted {formatInstant(p.createdAt)}
                    {p.verifiedAt ? ` · ${p.status} ${formatInstant(p.verifiedAt)} by ${p.verifiedBy}` : ""}
                    {p.rejectionReason ? ` · “${p.rejectionReason}”` : ""}
                  </p>
                  {p.receiptPath ? (
                    <a
                      href={`/api/admin/payments/${p.id}/receipt`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-zh-gold hover:underline"
                    >
                      View receipt
                    </a>
                  ) : null}
                </div>
                {p.status === "submitted" ? (
                  <PaymentReview paymentId={p.id} amount={formatPkr(p.amount)} reference={p.reference} method={p.method} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.3em] text-zinc-400">History</h2>
        {b.events.length === 0 ? (
          <EmptyState title="No history recorded" />
        ) : (
          <ol className="space-y-2 border-l border-white/10 pl-4">
            {b.events.map((e) => (
              <li key={e.id} className="text-sm">
                <p className="text-zinc-200">{e.message}</p>
                <p className="text-xs text-zinc-500">
                  {formatInstant(e.createdAt)} · {e.actor}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/50 p-5">
      <h2 className="mb-3 text-[11px] uppercase tracking-[0.3em] text-zinc-400">{title}</h2>
      <dl className="space-y-2 text-sm">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="break-words text-zinc-200">{children}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-1 text-sm text-white sm:text-base">{value}</p>
    </div>
  );
}
