import { EVENT_TYPES } from "@/lib/enquiry";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { adminPageGuard } from "@/lib/admin-guard";
import { EmptyState, PaymentBadge, StatusBadge } from "@/components/admin/Badges";
import { SERVICES, SERVICE_TYPES } from "@/lib/booking-rules";
import { BOOKING_STATUSES, PAYMENT_STATUSES, bookingStatusLabel, paymentStatusLabel } from "@/lib/booking-status";

export const dynamic = "force-dynamic";

type Search = { q?: string; status?: string; kind?: string; service?: string; payment?: string; from?: string; to?: string; when?: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const KINDS = [
  { value: "wedding_package", label: "Wedding packages" },
  { value: "event", label: "Event enquiries" },
  { value: "general", label: "Other requests" }
];

function what(b: { packageName: string | null; eventType: string | null; serviceType: string }) {
  if (b.packageName) return b.packageName.replace(" Wedding Package", "");
  if (b.eventType) return EVENT_TYPES[b.eventType as keyof typeof EVENT_TYPES]?.label ?? b.eventType;
  return SERVICES[b.serviceType as keyof typeof SERVICES]?.label.split(" (")[0] ?? b.serviceType;
}

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await adminPageGuard("/admin/bookings");
  const sp = await searchParams;
  const now = new Date();

  const where: Prisma.BookingWhereInput = { AND: [] };
  const and = where.AND as Prisma.BookingWhereInput[];
  const q = sp.q?.trim().slice(0, 100);
  if (q) {
    and.push({
      OR: [
        { names: { contains: q } },
        { email: { contains: q.toLowerCase() } },
        { phone: { contains: q } },
        { confirmationCode: { contains: q.toUpperCase() } },
        { city: { contains: q } }
      ]
    });
  }
  if (sp.status === "held") and.push({ status: "pending", holdExpiresAt: { gt: now } });
  else if (sp.status && (BOOKING_STATUSES as readonly string[]).includes(sp.status)) and.push({ status: sp.status });
  if (sp.kind && KINDS.some((k) => k.value === sp.kind)) and.push({ kind: sp.kind });
  if (sp.service && (SERVICE_TYPES as readonly string[]).includes(sp.service)) and.push({ serviceType: sp.service });
  if (sp.payment && (PAYMENT_STATUSES as readonly string[]).includes(sp.payment)) and.push({ paymentStatus: sp.payment });
  if (sp.from && DATE_RE.test(sp.from)) and.push({ eventDate: { gte: sp.from } });
  if (sp.to && DATE_RE.test(sp.to)) and.push({ eventDate: { lte: sp.to } });
  if (sp.when === "upcoming") and.push({ startsAt: { gte: now } });

  const [rows, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: sp.when === "upcoming" ? [{ startsAt: "asc" }] : [{ createdAt: "desc" }],
      take: 200,
      include: { _count: { select: { functions: true } } }
    }),
    prisma.booking.count()
  ]);

  const filtered = Boolean(q || sp.status || sp.kind || sp.service || sp.payment || sp.from || sp.to || sp.when);
  const input =
    "h-10 rounded-lg border border-white/10 bg-black/60 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zh-gold/50 focus:outline-none";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-white sm:text-4xl">Bookings</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {rows.length} shown{filtered ? ` · ${total} total` : ""}
          </p>
        </div>
      </header>

      <form className="grid gap-2 rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <input name="q" defaultValue={q} placeholder="Name, email, phone, ref, city" aria-label="Search" className={`${input} lg:col-span-2`} />
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className={input}>
          <option value="">All statuses</option>
          <option value="held">On hold</option>
          {BOOKING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {bookingStatusLabel(s)}
            </option>
          ))}
        </select>
        <select name="kind" defaultValue={sp.kind ?? ""} aria-label="Enquiry type" className={input}>
          <option value="">All enquiry types</option>
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <select name="service" defaultValue={sp.service ?? ""} aria-label="Service" className={input}>
          <option value="">All services</option>
          {SERVICE_TYPES.map((s) => (
            <option key={s} value={s}>
              {SERVICES[s].label.split(" (")[0]}
            </option>
          ))}
        </select>
        <select name="payment" defaultValue={sp.payment ?? ""} aria-label="Payment" className={input}>
          <option value="">Any payment</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {paymentStatusLabel(s)}
            </option>
          ))}
        </select>
        <div className="flex gap-2 lg:col-span-1">
          <button type="submit" className="h-10 flex-1 rounded-lg bg-zh-gold px-4 text-xs font-semibold uppercase tracking-[0.2em] text-black">
            Filter
          </button>
          {filtered ? (
            <Link href="/admin/bookings" className="flex h-10 items-center rounded-lg border border-white/10 px-3 text-xs text-zinc-400">
              Clear
            </Link>
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-500 sm:col-span-1 lg:col-span-2">
          From
          <input type="date" name="from" defaultValue={sp.from} className={`${input} flex-1`} />
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-500 lg:col-span-2">
          To
          <input type="date" name="to" defaultValue={sp.to} className={`${input} flex-1`} />
        </label>
      </form>

      {rows.length === 0 ? (
        <EmptyState title={filtered ? "No bookings match these filters" : "No bookings yet"}>
          {filtered ? "Try clearing a filter." : "Requests made on the website's booking page will appear here."}
        </EmptyState>
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {rows.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/bookings/${b.id}`} className="block rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-white">{b.names}</span>
                    <StatusBadge status={b.status} holdExpiresAt={b.holdExpiresAt} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {what(b)} · {b.eventDate}
                    {b._count.functions > 1 ? ` + ${b._count.functions - 1} more` : b.startTime ? ` · ${b.startTime}–${b.endTime}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {b.city} · {b.phone}
                  </p>
                  <div className="mt-2">
                    <PaymentBadge status={b.paymentStatus} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-2xl border border-white/10 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950/80 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-normal">Client</th>
                  <th className="px-4 py-3 font-normal">Service</th>
                  <th className="px-4 py-3 font-normal">Event</th>
                  <th className="px-4 py-3 font-normal">Status</th>
                  <th className="px-4 py-3 font-normal">Payment</th>
                  <th className="px-4 py-3 font-normal">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/bookings/${b.id}`} className="text-white hover:text-zh-gold">
                        {b.names}
                      </Link>
                      <p className="text-xs text-zinc-500">{b.email}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {what(b)}
                      {b.estimatedTotal != null ? <p className="text-xs text-zh-gold/80">Est. PKR {b.estimatedTotal.toLocaleString("en-PK")}</p> : null}
                      {b.whatsappRequested ? <p className="text-xs text-emerald-300/80">Via WhatsApp</p> : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {b.eventDate}
                      {b._count.functions > 1 ? <span className="text-xs text-zinc-500"> + {b._count.functions - 1} more</span> : null}
                      <p className="text-xs text-zinc-500">
                        {b.startTime ? `${b.startTime}–${b.endTime}` : "Full day"} · {b.city}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} holdExpiresAt={b.holdExpiresAt} />
                    </td>
                    <td className="px-4 py-3">
                      <PaymentBadge status={b.paymentStatus} />
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{b.createdAt.toLocaleDateString("en-GB")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
