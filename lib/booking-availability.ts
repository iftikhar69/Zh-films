import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  BLOCKING_STATUSES,
  HOLDING_STATUS,
  TEAM_ID,
  formatLocalTime,
  zonedTimeToUtc,
  type Slot
} from "@/lib/booking-rules";

type Tx = Prisma.TransactionClient;

export class SlotUnavailableError extends Error {
  constructor(public conflicts: { blockStart: Date; blockEnd: Date }[]) {
    super("That time is no longer available. Please choose another date or time.");
  }
}

/** Bookings that occupy any part of [from, to) for the team right now. */
function blockingWhere(from: Date, to: Date, now: Date, excludeId?: string): Prisma.BookingWhereInput {
  return {
    teamId: TEAM_ID,
    id: excludeId ? { not: excludeId } : undefined,
    blockStart: { lt: to },
    blockEnd: { gt: from },
    OR: [
      { status: { in: [...BLOCKING_STATUSES] } },
      { status: HOLDING_STATUS, holdExpiresAt: { gt: now } }
    ]
  };
}

/**
 * Runs `fn` while holding the team's schedule lock. The lock row is written first, which in
 * SQLite takes the database write lock (and in Postgres a row lock), so a second request for
 * the same team waits until the first commits before it checks for conflicts.
 */
export async function withScheduleLock<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  // Queue in-process first so SQLite isn't flooded with writers waiting on its single lock;
  // the database lock below still protects against other server processes.
  const run = queue.then(() => lockedTransaction(fn));
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

let queue: Promise<unknown> = Promise.resolve();

const RETRYABLE = new Set(["P1008", "P2034", "P1017"]);

async function lockedTransaction<T>(fn: (tx: Tx) => Promise<T>, attempt = 0): Promise<T> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        await tx.scheduleLock.upsert({
          where: { teamId: TEAM_ID },
          create: { teamId: TEAM_ID, version: 1 },
          update: { version: { increment: 1 } }
        });
        return fn(tx);
      },
      { maxWait: 10000, timeout: 15000 }
    );
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code && RETRYABLE.has(code) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 150 * 2 ** attempt + Math.random() * 100));
      return lockedTransaction(fn, attempt + 1);
    }
    throw e;
  }
}

type Range = { blockStart: Date; blockEnd: Date };
type Db = Tx | typeof prisma;

function blockingStatus(now: Date): Prisma.BookingWhereInput {
  return {
    OR: [{ status: { in: [...BLOCKING_STATUSES] } }, { status: HOLDING_STATUS, holdExpiresAt: { gt: now } }]
  };
}

/** Blocking ranges overlapping [from, to): booking rows plus their individual functions. */
async function blockingRanges(db: Db, from: Date, to: Date, now: Date, excludeId?: string): Promise<Range[]> {
  const [rows, fns, blocked] = await Promise.all([
    db.booking.findMany({ where: blockingWhere(from, to, now, excludeId), select: { blockStart: true, blockEnd: true } }),
    db.bookingFunction.findMany({
      where: {
        teamId: TEAM_ID,
        blockStart: { lt: to },
        blockEnd: { gt: from },
        booking: { ...blockingStatus(now), id: excludeId ? { not: excludeId } : undefined }
      },
      select: { blockStart: true, blockEnd: true }
    }),
    db.blockedDate.findMany({
      where: { teamId: TEAM_ID, blockStart: { lt: to }, blockEnd: { gt: from } },
      select: { blockStart: true, blockEnd: true }
    })
  ]);
  const seen = new Set<string>();
  return [...(rows as Range[]), ...fns, ...blocked].filter((r) => {
    const k = `${r.blockStart.getTime()}-${r.blockEnd.getTime()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function assertSlotFree(tx: Tx, slot: Pick<Slot, "blockStart" | "blockEnd">, now = new Date(), excludeId?: string) {
  const conflicts = await blockingRanges(tx, slot.blockStart, slot.blockEnd, now, excludeId);
  if (conflicts.length) throw new SlotUnavailableError(conflicts);
}

/** Every time range a booking occupies: its functions, or the single booking slot for older rows. */
export async function bookingRanges(db: Db, booking: { id: string; blockStart: Date | null; blockEnd: Date | null }) {
  const fns = await db.bookingFunction.findMany({
    where: { bookingId: booking.id },
    select: { blockStart: true, blockEnd: true },
    orderBy: { sortOrder: "asc" }
  });
  if (fns.length) return fns as Range[];
  return booking.blockStart && booking.blockEnd ? [{ blockStart: booking.blockStart, blockEnd: booking.blockEnd }] : [];
}

/** Checks all of a booking's ranges against everyone else's blocking ranges. */
export async function assertBookingFree(tx: Tx, booking: { id: string; blockStart: Date | null; blockEnd: Date | null }, now = new Date()) {
  const ranges = await bookingRanges(tx, booking);
  for (const r of ranges) await assertSlotFree(tx, r, now, booking.id);
  return ranges.length;
}

/**
 * Staff view: other pending/confirmed/completed bookings overlapping any of this booking's ranges.
 * Includes plain pending requests so the owner can review clashes before confirming.
 */
export async function findOverlaps(booking: { id: string; blockStart: Date | null; blockEnd: Date | null; teamId: string }) {
  const ranges = await bookingRanges(prisma, booking);
  const open = { in: ["pending", "confirmed", "completed"] };
  const found = new Map<string, { id: string; names: string; status: string; holdExpiresAt: Date | null; when: string }>();
  for (const r of ranges) {
    const [rows, fns] = await Promise.all([
      prisma.booking.findMany({
        where: { id: { not: booking.id }, teamId: booking.teamId, status: open, blockStart: { lt: r.blockEnd }, blockEnd: { gt: r.blockStart } },
        select: { id: true, names: true, status: true, holdExpiresAt: true, eventDate: true, startTime: true, endTime: true }
      }),
      prisma.bookingFunction.findMany({
        where: { teamId: booking.teamId, blockStart: { lt: r.blockEnd }, blockEnd: { gt: r.blockStart }, booking: { id: { not: booking.id }, status: open } },
        select: { type: true, eventDate: true, startTime: true, endTime: true, booking: { select: { id: true, names: true, status: true, holdExpiresAt: true } } }
      })
    ]);
    for (const o of rows) found.set(o.id, { ...o, when: `${o.eventDate} ${o.startTime ?? ""}–${o.endTime ?? ""}` });
    for (const f of fns) found.set(f.booking.id, { ...f.booking, when: `${f.type} · ${f.eventDate} ${f.startTime}–${f.endTime}` });
  }
  return [...found.values()];
}

/**
 * Public, anonymised view of one calendar day: only the busy time ranges (buffers included),
 * never names, contacts or status.
 */
export async function busyRangesForDate(date: string, now = new Date()) {
  const dayStart = zonedTimeToUtc(date, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const rows = (await blockingRanges(prisma, dayStart, dayEnd, now)).sort((a, b) => a.blockStart.getTime() - b.blockStart.getTime());
  return rows.map((r) => {
    const from = r.blockStart! < dayStart ? dayStart : r.blockStart!;
    const to = r.blockEnd! > dayEnd ? dayEnd : r.blockEnd!;
    return { from: formatLocalTime(from), to: to.getTime() === dayEnd.getTime() ? "24:00" : formatLocalTime(to) };
  });
}

/** Count of distinct upcoming dates with a confirmed (not merely requested) booking. */
export async function confirmedDatesAhead(days: number, now = new Date()) {
  const until = new Date(now.getTime() + days * 86400000);
  const rows = await prisma.booking.findMany({
    where: {
      teamId: TEAM_ID,
      status: { in: [...BLOCKING_STATUSES] },
      startsAt: { gte: now, lt: until }
    },
    select: { eventDate: true },
    distinct: ["eventDate"]
  });
  return rows.length;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Whole-day UTC span for an inclusive local date range. */
export function dayRange(startDate: string, endDate: string) {
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) throw new Error("Use YYYY-MM-DD dates.");
  if (endDate < startDate) throw new Error("The end date is before the start date.");
  const blockStart = zonedTimeToUtc(startDate, "00:00");
  const blockEnd = new Date(zonedTimeToUtc(endDate, "00:00").getTime() + 86400000);
  if ((blockEnd.getTime() - blockStart.getTime()) / 86400000 > 366) throw new Error("Block at most one year at a time.");
  return { blockStart, blockEnd };
}

export class BlockConflictError extends Error {
  constructor(public bookings: { id: string; names: string; eventDate: string }[]) {
    super("Confirmed or held bookings already fall on these dates.");
  }
}

/**
 * Marks dates Busy. Refuses when a confirmed or currently held booking overlaps, unless
 * `force` is set, so the owner never silently strands an accepted client.
 */
export async function blockDates(input: { startDate: string; endDate: string; reason?: string | null; createdBy?: string | null; force?: boolean }, now = new Date()) {
  const { blockStart, blockEnd } = dayRange(input.startDate, input.endDate);
  return withScheduleLock(async (tx) => {
    if (!input.force) {
      const hit = await tx.booking.findMany({
        where: {
          teamId: TEAM_ID,
          OR: [
            blockingWhere(blockStart, blockEnd, now),
            { functions: { some: { blockStart: { lt: blockEnd }, blockEnd: { gt: blockStart } } }, ...blockingStatus(now) }
          ]
        },
        select: { id: true, names: true, eventDate: true }
      });
      if (hit.length) throw new BlockConflictError(hit);
    }
    return tx.blockedDate.create({
      data: { teamId: TEAM_ID, startDate: input.startDate, endDate: input.endDate, reason: input.reason?.trim() || null, blockStart, blockEnd, createdBy: input.createdBy ?? null }
    });
  });
}
