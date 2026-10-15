/**
 * Scheduling rules for the ZH Films production team. Pure functions only, so they
 * can be unit tested and shared by the API, the booking form and the admin desk.
 */

export const BOOKING_TIMEZONE = "Asia/Karachi";

/** All bookings are scheduled against one production team (the Film Family). */
export const TEAM_ID = "film-family";

export const BOOKING_WINDOW = {
  /** Enquiries must be at least this many days ahead of the event (in the event timezone). */
  minLeadDays: 2,
  /** How far ahead clients can book. */
  maxAdvanceDays: 730
};

/** A pending request reserves its slot for this long, then stops blocking other clients. */
export const PENDING_HOLD_HOURS = 48;

export const SERVICES = {
  wedding: { label: "Wedding", bufferBeforeMin: 90, bufferAfterMin: 60, defaultStart: "14:00", defaultEnd: "23:00" },
  nikah: { label: "Nikah ceremony", bufferBeforeMin: 60, bufferAfterMin: 60, defaultStart: "11:00", defaultEnd: "15:00" },
  event: { label: "Event (mehndi, walima, AKU, corporate)", bufferBeforeMin: 60, bufferAfterMin: 60, defaultStart: "18:00", defaultEnd: "23:00" },
  shoot: { label: "Cinematic shoot (pre-wedding, brand, commercial)", bufferBeforeMin: 60, bufferAfterMin: 30, defaultStart: "09:00", defaultEnd: "15:00" },
  photography: { label: "Photography session", bufferBeforeMin: 30, bufferAfterMin: 30, defaultStart: "10:00", defaultEnd: "13:00" },
  videography: { label: "Videography session", bufferBeforeMin: 45, bufferAfterMin: 30, defaultStart: "10:00", defaultEnd: "14:00" }
} as const;

export type ServiceType = keyof typeof SERVICES;
export const SERVICE_TYPES = Object.keys(SERVICES) as [ServiceType, ...ServiceType[]];

/** Statuses that always occupy the team's calendar. */
export const BLOCKING_STATUSES = ["confirmed", "in_production", "delivered"] as const;
/** Pending blocks only while its hold is active; cancelled/declined never block. */
export const HOLDING_STATUS = "pending";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Offset in minutes of `timeZone` from UTC at the given instant. */
function tzOffsetMinutes(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(at);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** Converts a wall-clock date + time in `timeZone` to a UTC instant. */
export function zonedTimeToUtc(date: string, time: string, timeZone = BOOKING_TIMEZONE) {
  const [, y, m, d] = DATE_RE.exec(date)!.map(Number);
  const [, hh, mm] = TIME_RE.exec(time)!.map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offset = tzOffsetMinutes(new Date(guess), timeZone);
  return new Date(guess - offset * 60000);
}

/** Today's calendar date (YYYY-MM-DD) in `timeZone`. */
export function todayIn(timeZone = BOOKING_TIMEZONE, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function isRealDate(date: string) {
  const m = DATE_RE.exec(date);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function daysBetween(fromDate: string, toDate: string) {
  return Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86400000);
}

export type SlotInput = { serviceType: ServiceType; eventDate: string; startTime: string; endTime: string };

export type Slot = {
  startsAt: Date;
  endsAt: Date;
  /** startsAt/endsAt widened by the service's setup and travel buffers. */
  blockStart: Date;
  blockEnd: Date;
};

export type SlotResult = { ok: true; slot: Slot } | { ok: false; error: string; field: keyof SlotInput };

/**
 * Validates a requested slot and resolves it to UTC instants. An end time earlier than
 * the start time means the event runs past midnight (e.g. a mehndi from 20:00 to 02:00).
 */
export function resolveSlot(input: SlotInput, now = new Date()): SlotResult {
  const service = SERVICES[input.serviceType];
  if (!service) return { ok: false, field: "serviceType", error: "Choose a service" };
  if (!isRealDate(input.eventDate)) return { ok: false, field: "eventDate", error: "Enter a valid date" };
  if (!TIME_RE.test(input.startTime)) return { ok: false, field: "startTime", error: "Enter a start time (HH:MM)" };
  if (!TIME_RE.test(input.endTime)) return { ok: false, field: "endTime", error: "Enter an end time (HH:MM)" };
  if (input.startTime === input.endTime) return { ok: false, field: "endTime", error: "End time must differ from start time" };

  const lead = daysBetween(todayIn(BOOKING_TIMEZONE, now), input.eventDate);
  if (lead < 0) return { ok: false, field: "eventDate", error: "That date has already passed" };
  if (lead < BOOKING_WINDOW.minLeadDays) {
    return {
      ok: false,
      field: "eventDate",
      error: `Please book at least ${BOOKING_WINDOW.minLeadDays} days ahead — for anything sooner, call or WhatsApp us`
    };
  }
  if (lead > BOOKING_WINDOW.maxAdvanceDays) {
    return { ok: false, field: "eventDate", error: "We take bookings up to two years ahead" };
  }

  const startsAt = zonedTimeToUtc(input.eventDate, input.startTime);
  let endsAt = zonedTimeToUtc(input.eventDate, input.endTime);
  if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 86400000);
  if (endsAt.getTime() - startsAt.getTime() > 16 * 3600000) {
    return { ok: false, field: "endTime", error: "A single booking can cover up to 16 hours — split longer events into two bookings" };
  }

  return {
    ok: true,
    slot: {
      startsAt,
      endsAt,
      blockStart: new Date(startsAt.getTime() - service.bufferBeforeMin * 60000),
      blockEnd: new Date(endsAt.getTime() + service.bufferAfterMin * 60000)
    }
  };
}

export function overlaps(a: { blockStart: Date; blockEnd: Date }, b: { blockStart: Date; blockEnd: Date }) {
  return a.blockStart < b.blockEnd && b.blockStart < a.blockEnd;
}

/** Whether a booking currently occupies the team calendar. */
export function isBlocking(b: { status: string; holdExpiresAt: Date | null }, now = new Date()) {
  if ((BLOCKING_STATUSES as readonly string[]).includes(b.status)) return true;
  return b.status === HOLDING_STATUS && b.holdExpiresAt !== null && b.holdExpiresAt > now;
}

export function holdExpiry(now = new Date()) {
  return new Date(now.getTime() + PENDING_HOLD_HOURS * 3600000);
}

export function formatLocalTime(d: Date, timeZone = BOOKING_TIMEZONE) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
}
