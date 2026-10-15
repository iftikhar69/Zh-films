import { WEDDING_FUNCTIONS } from "@/lib/enquiry";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { adminPageGuard } from "@/lib/admin-guard";
import { todayIn } from "@/lib/booking-rules";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function shiftMonth(ym: string, by: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await adminPageGuard("/admin/calendar");
  const sp = await searchParams;
  const today = todayIn();
  const month = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const now = new Date();

  const range = { gte: `${month}-01`, lte: `${month}-${String(daysInMonth).padStart(2, "0")}` };
  const blocking = { OR: [{ status: { in: ["confirmed", "completed"] } }, { status: "pending", holdExpiresAt: { gt: now } }] };
  const [single, fns] = await Promise.all([
    prisma.booking.findMany({
      where: { eventDate: range, functions: { none: {} }, ...blocking },
      select: { id: true, names: true, eventDate: true, startTime: true, endTime: true, status: true, holdExpiresAt: true }
    }),
    prisma.bookingFunction.findMany({
      where: { eventDate: range, booking: blocking },
      select: {
        type: true,
        eventDate: true,
        startTime: true,
        endTime: true,
        booking: { select: { id: true, names: true, status: true, holdExpiresAt: true } }
      }
    })
  ]);
  const rows = [
    ...single,
    ...fns.map((f) => ({
      ...f.booking,
      names: `${f.booking.names} · ${WEDDING_FUNCTIONS[f.type as keyof typeof WEDDING_FUNCTIONS]?.label ?? f.type}`,
      eventDate: f.eventDate,
      startTime: f.startTime as string | null,
      endTime: f.endTime as string | null
    }))
  ].sort((a, b) => a.eventDate.localeCompare(b.eventDate) || (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  const byDay = new Map<string, typeof rows>();
  for (const r of rows) byDay.set(r.eventDate, [...(byDay.get(r.eventDate) ?? []), r]);

  const label = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-white sm:text-4xl">Calendar</h1>
          <p className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Confirmed</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-400" /> Completed</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-dashed border-fuchsia-400" /> Temporary hold</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/calendar?month=${shiftMonth(month, -1)}`} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300" aria-label="Previous month">←</Link>
          <span className="min-w-36 text-center font-serif text-lg text-white">{label}</span>
          <Link href={`/admin/calendar?month=${shiftMonth(month, 1)}`} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300" aria-label="Next month">→</Link>
        </div>
      </header>

      <div className="hidden grid-cols-7 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-zinc-950 px-2 py-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">{d}</div>
        ))}
        {cells.map((day, i) => {
          const date = day ? `${month}-${String(day).padStart(2, "0")}` : "";
          const items = day ? byDay.get(date) ?? [] : [];
          return (
            <div key={i} className={cn("min-h-28 bg-black p-2", date === today && "ring-1 ring-inset ring-zh-gold/60")}>
              {day ? <p className={cn("text-xs", date === today ? "text-zh-gold" : "text-zinc-500")}>{day}</p> : null}
              <ul className="mt-1 space-y-1">
                {items.map((b) => (
                  <li key={`${b.id}-${b.eventDate}-${b.startTime}`}>
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className={cn(
                        "block truncate rounded px-1.5 py-1 text-[11px]",
                        b.status === "pending"
                          ? "border border-dashed border-fuchsia-400/60 text-fuchsia-200"
                          : b.status === "completed"
                            ? "bg-sky-500/15 text-sky-200"
                            : "bg-emerald-500/15 text-emerald-200"
                      )}
                    >
                      {b.startTime} {b.names}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <ul className="space-y-2 md:hidden">
        {rows.length === 0 ? <li className="text-sm text-zinc-500">Nothing confirmed or held in {label}.</li> : null}
        {rows.map((b) => (
          <li key={`${b.id}-${b.eventDate}-${b.startTime}`}>
            <Link href={`/admin/bookings/${b.id}`} className="flex justify-between gap-3 rounded-xl border border-white/10 bg-black/40 p-3 text-sm">
              <span>
                <span className="block text-white">{b.names}</span>
                <span className="text-xs text-zinc-500">{b.eventDate} · {b.startTime}–{b.endTime}</span>
              </span>
              <span className={cn("text-xs", b.status === "pending" ? "text-fuchsia-300" : "text-emerald-300")}>
                {b.status === "pending" ? "Hold" : b.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? (
        <p className="hidden text-sm text-zinc-500 md:block">Nothing confirmed or held in {label}.</p>
      ) : null}
    </div>
  );
}
