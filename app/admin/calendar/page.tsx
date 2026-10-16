import { WEDDING_FUNCTIONS } from "@/lib/enquiry";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { adminPageGuard } from "@/lib/admin-guard";
import { TEAM_ID, todayIn } from "@/lib/booking-rules";
import { cn } from "@/lib/utils";
import { BlockDatesForm, UnblockButton } from "@/components/admin/BlockDates";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Kind = "confirmed" | "completed" | "hold" | "request";

const STYLE: Record<Kind, string> = {
  confirmed: "bg-emerald-500/15 text-emerald-200",
  completed: "bg-sky-500/15 text-sky-200",
  hold: "border border-dashed border-fuchsia-400/60 text-fuchsia-200",
  request: "border border-amber-400/40 text-amber-200"
};
const LABEL: Record<Kind, string> = {
  confirmed: "Confirmed",
  completed: "Completed",
  hold: "Held",
  request: "Pending review"
};

function shiftMonth(ym: string, by: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; day?: string }> }) {
  await adminPageGuard("/admin/calendar");
  const sp = await searchParams;
  const today = todayIn();
  const month = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : (sp.day?.slice(0, 7) ?? today.slice(0, 7));
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const now = new Date();
  const first = `${month}-01`;
  const last = `${month}-${String(daysInMonth).padStart(2, "0")}`;
  const selected = sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) && sp.day.startsWith(month) ? sp.day : null;

  const range = { gte: first, lte: last };
  const open = { status: { in: ["pending", "confirmed", "completed"] } };
  const [single, fns, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: { eventDate: range, functions: { none: {} }, ...open },
      select: { id: true, names: true, eventDate: true, startTime: true, endTime: true, status: true, holdExpiresAt: true }
    }),
    prisma.bookingFunction.findMany({
      where: { eventDate: range, booking: open },
      select: {
        type: true,
        eventDate: true,
        startTime: true,
        endTime: true,
        booking: { select: { id: true, names: true, status: true, holdExpiresAt: true } }
      }
    }),
    prisma.blockedDate.findMany({
      where: { teamId: TEAM_ID, startDate: { lte: last }, endDate: { gte: first } },
      orderBy: { startDate: "asc" }
    })
  ]);
  const kindOf = (b: { status: string; holdExpiresAt: Date | null }): Kind =>
    b.status === "pending" ? (b.holdExpiresAt && b.holdExpiresAt > now ? "hold" : "request") : (b.status as Kind);
  const rows = [
    ...single,
    ...fns.map((f) => ({
      ...f.booking,
      names: `${f.booking.names} · ${WEDDING_FUNCTIONS[f.type as keyof typeof WEDDING_FUNCTIONS]?.label ?? f.type}`,
      eventDate: f.eventDate,
      startTime: f.startTime as string | null,
      endTime: f.endTime as string | null
    }))
  ]
    .map((r) => ({ ...r, kind: kindOf(r) }))
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  const byDay = new Map<string, typeof rows>();
  for (const r of rows) byDay.set(r.eventDate, [...(byDay.get(r.eventDate) ?? []), r]);
  const blockFor = (date: string) => blocks.find((b) => b.startDate <= date && b.endDate >= date);

  const label = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const dayHref = (date: string) => `/admin/calendar?month=${month}&day=${date}`;

  const selItems = selected ? byDay.get(selected) ?? [] : [];
  const selBlock = selected ? blockFor(selected) : undefined;
  const selTaken = selBlock || selItems.some((i) => i.kind !== "request");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-white sm:text-4xl">Calendar</h1>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Confirmed</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-dashed border-fuchsia-400" /> Held (blocks the date until it expires)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-amber-400" /> Pending review (does not block)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-zinc-500" /> Busy</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-400" /> Completed</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/calendar?month=${shiftMonth(month, -1)}`} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300" aria-label="Previous month">←</Link>
          <span className="min-w-36 text-center font-serif text-lg text-white">{label}</span>
          <Link href={`/admin/calendar?month=${shiftMonth(month, 1)}`} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300" aria-label="Next month">→</Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10">
            {WEEKDAYS.map((d) => (
              <div key={d} className="bg-zinc-950 px-1 py-2 text-center text-[10px] uppercase tracking-[0.15em] text-zinc-500 md:px-2 md:text-left">{d.slice(0, 2)}<span className="hidden md:inline">{d.slice(2)}</span></div>
            ))}
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="bg-black" />;
              const date = `${month}-${String(day).padStart(2, "0")}`;
              const items = byDay.get(date) ?? [];
              const block = blockFor(date);
              return (
                <Link
                  key={i}
                  href={dayHref(date)}
                  aria-label={`${date}${block ? ", busy" : ""}${items.length ? `, ${items.length} booking${items.length > 1 ? "s" : ""}` : ""}`}
                  className={cn(
                    "block min-h-14 p-1 md:min-h-28 md:p-2",
                    block ? "bg-[repeating-linear-gradient(135deg,#18181b_0_6px,#27272a_6px_12px)]" : "bg-black hover:bg-zinc-900",
                    date === today && "ring-1 ring-inset ring-zh-gold/60",
                    date === selected && "ring-2 ring-inset ring-white"
                  )}
                >
                  <p className={cn("text-xs", date === today ? "text-zh-gold" : "text-zinc-500")}>{day}</p>
                  {block ? <p className="mt-1 hidden text-[10px] uppercase tracking-wider text-zinc-300 md:block">Busy</p> : null}
                  <div className="mt-1 flex flex-wrap gap-0.5 md:hidden">
                    {items.map((b) => <span key={`${b.id}-${b.startTime}`} className={cn("h-1.5 w-1.5 rounded-full", STYLE[b.kind])} />)}
                  </div>
                  <ul className="mt-1 hidden space-y-1 md:block">
                    {items.map((b) => (
                      <li key={`${b.id}-${b.startTime}`} className={cn("truncate rounded px-1.5 py-1 text-[11px]", STYLE[b.kind])}>
                        {b.startTime} {b.names}
                      </li>
                    ))}
                  </ul>
                </Link>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-zinc-500">Tap a day to see what&apos;s on it.</p>
        </div>

        <aside className="space-y-4">
          {selected ? (
            <section className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950 p-4" aria-live="polite">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg text-white">{selected}</h2>
                <span className={cn("rounded-full px-2 py-0.5 text-xs", selTaken ? "bg-red-500/15 text-red-200" : "bg-emerald-500/15 text-emerald-200")}>
                  {selTaken ? "Not available" : "Available"}
                </span>
              </div>
              {selBlock ? (
                <div className="flex items-start justify-between gap-2 rounded-lg bg-white/5 p-3 text-sm">
                  <div>
                    <p className="text-white">Busy {selBlock.startDate === selBlock.endDate ? "" : `${selBlock.startDate} to ${selBlock.endDate}`}</p>
                    {selBlock.reason ? <p className="text-xs text-zinc-400">{selBlock.reason}</p> : null}
                  </div>
                  <UnblockButton id={selBlock.id} />
                </div>
              ) : null}
              {selItems.length ? (
                <ul className="space-y-2">
                  {selItems.map((b) => (
                    <li key={`${b.id}-${b.startTime}`}>
                      <Link href={`/admin/bookings/${b.id}`} className="block rounded-lg border border-white/10 p-3 text-sm hover:bg-white/5">
                        <span className="block text-white">{b.names}</span>
                        <span className="text-xs text-zinc-500">{b.startTime ?? "?"}–{b.endTime ?? "?"} · {LABEL[b.kind]}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : !selBlock ? (
                <p className="text-sm text-zinc-500">No bookings or requests on this day.</p>
              ) : null}
            </section>
          ) : null}
          <BlockDatesForm key={selected ?? today} defaultDate={selected ?? (today.startsWith(month) ? today : first)} />
          {blocks.length ? (
            <section className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
              <h2 className="text-sm text-white">Busy in {label}</h2>
              <ul className="mt-2 space-y-2">
                {blocks.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 text-xs text-zinc-300">
                    <span>{b.startDate === b.endDate ? b.startDate : `${b.startDate} → ${b.endDate}`}{b.reason ? ` · ${b.reason}` : ""}</span>
                    <UnblockButton id={b.id} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>

      {rows.length === 0 && blocks.length === 0 ? <p className="text-sm text-zinc-500">Nothing booked, requested or blocked in {label}.</p> : null}
    </div>
  );
}
