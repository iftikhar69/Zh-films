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
export async function withScheduleLock<T>(fn: (tx: Tx) => Promise<T>) {
  return prisma.$transaction(
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
}

export async function assertSlotFree(tx: Tx, slot: Pick<Slot, "blockStart" | "blockEnd">, now = new Date(), excludeId?: string) {
  const conflicts = await tx.booking.findMany({
    where: blockingWhere(slot.blockStart, slot.blockEnd, now, excludeId),
    select: { blockStart: true, blockEnd: true }
  });
  if (conflicts.length) throw new SlotUnavailableError(conflicts as { blockStart: Date; blockEnd: Date }[]);
}

/**
 * Public, anonymised view of one calendar day: only the busy time ranges (buffers included),
 * never names, contacts or status.
 */
export async function busyRangesForDate(date: string, now = new Date()) {
  const dayStart = zonedTimeToUtc(date, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const rows = await prisma.booking.findMany({
    where: blockingWhere(dayStart, dayEnd, now),
    select: { blockStart: true, blockEnd: true },
    orderBy: { blockStart: "asc" }
  });
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
