import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { adminPageGuard } from "@/lib/admin-guard";
import { EmptyState, PaymentBadge, StatusBadge } from "@/components/admin/Badges";
import { SERVICES } from "@/lib/booking-rules";
import { formatPkr } from "@/lib/notify";

export const dynamic = "force-dynamic";

const serviceLabel = (t: string) => SERVICES[t as keyof typeof SERVICES]?.label.split(" (")[0] ?? t;

export default async function AdminOverview() {
  await adminPageGuard("/admin");
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86400000);
  const in30 = new Date(now.getTime() + 30 * 86400000);

  const [newRequests, pending, held, confirmedUpcoming, awaitingVerification, upcoming, latest, payments, emailIssues] =
    await Promise.all([
      prisma.booking.count({ where: { status: "pending", createdAt: { gte: dayAgo } } }),
      prisma.booking.count({ where: { status: "pending" } }),
      prisma.booking.count({ where: { status: "pending", holdExpiresAt: { gt: now } } }),
      prisma.booking.count({ where: { status: "confirmed", startsAt: { gte: now } } }),
      prisma.payment.count({ where: { status: "submitted" } }),
      prisma.booking.findMany({
        where: { status: "confirmed", startsAt: { gte: now, lte: in30 } },
        orderBy: { startsAt: "asc" },
        take: 8
      }),
      prisma.booking.findMany({ where: { status: "pending" }, orderBy: { createdAt: "desc" }, take: 6 }),
      prisma.payment.findMany({
        where: { status: "submitted" },
        include: { booking: { select: { id: true, names: true, confirmationCode: true } } },
        orderBy: { createdAt: "asc" },
        take: 6
      }),
      prisma.emailLog.count({ where: { status: "failed", createdAt: { gte: new Date(now.getTime() - 7 * 86400000) } } })
    ]);

  const stats = [
    { label: "New requests (24h)", value: newRequests, href: "/admin/bookings?status=pending" },
    { label: "Pending review", value: pending, href: "/admin/bookings?status=pending" },
    { label: "On hold", value: held, href: "/admin/bookings?status=held" },
    { label: "Confirmed upcoming", value: confirmedUpcoming, href: "/admin/bookings?status=confirmed&when=upcoming" },
    { label: "Payments to verify", value: awaitingVerification, href: "/admin/payments" }
  ];

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-serif text-3xl text-white sm:text-4xl">Overview</h1>
        <p className="mt-2 text-sm text-zinc-400">Live from your booking records.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 transition-colors hover:border-zh-gold/40"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{s.label}</p>
            <p className="mt-2 font-serif text-3xl text-zh-gold">{s.value}</p>
          </Link>
        ))}
      </section>

      {emailIssues > 0 ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {emailIssues} email{emailIssues === 1 ? "" : "s"} failed to send in the last 7 days. Check your email provider settings.
        </p>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-2">
        <section>
          <SectionHead title="Waiting for review" href="/admin/bookings?status=pending" />
          {latest.length === 0 ? (
            <EmptyState title="No pending requests">New booking requests from the website appear here.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {latest.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/admin/bookings/${b.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 p-4 hover:border-zh-gold/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-white">{b.names}</span>
                      <span className="block text-xs text-zinc-500">
                        {serviceLabel(b.serviceType)} · {b.eventDate} {b.startTime ? `· ${b.startTime}–${b.endTime}` : ""}
                      </span>
                    </span>
                    <StatusBadge status={b.status} holdExpiresAt={b.holdExpiresAt} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionHead title="Next 30 days" href="/admin/calendar" />
          {upcoming.length === 0 ? (
            <EmptyState title="No confirmed events in the next 30 days" />
          ) : (
            <ul className="space-y-2">
              {upcoming.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/admin/bookings/${b.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/15 bg-black/40 p-4 hover:border-zh-gold/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-white">{b.names}</span>
                      <span className="block text-xs text-zinc-500">
                        {b.eventDate} · {b.startTime}–{b.endTime} · {b.city}
                      </span>
                    </span>
                    <PaymentBadge status={b.paymentStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="xl:col-span-2">
          <SectionHead title="Payments awaiting verification" href="/admin/payments" />
          {payments.length === 0 ? (
            <EmptyState title="Nothing to verify">Payments customers report will appear here until you check them.</EmptyState>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {payments.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/bookings/${p.booking.id}#payments`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-orange-400/20 bg-black/40 p-4 hover:border-zh-gold/40"
                  >
                    <span>
                      <span className="block text-white">{p.booking.names}</span>
                      <span className="block font-mono text-xs text-zinc-500">
                        {p.method} · {p.reference}
                      </span>
                    </span>
                    <span className="text-sm text-zh-gold">{formatPkr(p.amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function SectionHead({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[11px] uppercase tracking-[0.3em] text-zinc-400">{title}</h2>
      <Link href={href} className="text-xs text-zh-gold hover:underline">
        View all →
      </Link>
    </div>
  );
}
