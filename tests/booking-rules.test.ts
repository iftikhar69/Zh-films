import { test } from "node:test";
import assert from "node:assert/strict";
import { isBlocking, overlaps, resolveSlot, todayIn, zonedTimeToUtc } from "../lib/booking-rules";

const NOW = new Date("2026-10-15T10:00:00Z"); // 15:00 in Karachi

test("converts Pakistan wall-clock time to UTC (UTC+5, no DST)", () => {
  assert.equal(zonedTimeToUtc("2026-12-20", "14:00").toISOString(), "2026-12-20T09:00:00.000Z");
  assert.equal(zonedTimeToUtc("2026-06-20", "00:30").toISOString(), "2026-06-19T19:30:00.000Z");
});

test("'today' is evaluated in the event timezone, not the server's", () => {
  // 20:30 UTC on the 15th is already the 16th in Karachi.
  assert.equal(todayIn("Asia/Karachi", new Date("2026-10-15T20:30:00Z")), "2026-10-16");
});

test("rejects invalid, past, too-soon and too-far dates", () => {
  const base = { serviceType: "wedding" as const, startTime: "14:00", endTime: "22:00" };
  assert.equal(resolveSlot({ ...base, eventDate: "2026-02-30" }, NOW).ok, false);
  assert.equal(resolveSlot({ ...base, eventDate: "2026-10-14" }, NOW).ok, false);
  assert.equal(resolveSlot({ ...base, eventDate: "2026-10-16" }, NOW).ok, false);
  assert.equal(resolveSlot({ ...base, eventDate: "2026-10-17" }, NOW).ok, true);
  assert.equal(resolveSlot({ ...base, eventDate: "2029-01-01" }, NOW).ok, false);
});

test("rejects malformed and zero-length times", () => {
  const base = { serviceType: "nikah" as const, eventDate: "2026-12-01" };
  assert.equal(resolveSlot({ ...base, startTime: "25:00", endTime: "12:00" }, NOW).ok, false);
  assert.equal(resolveSlot({ ...base, startTime: "12:00", endTime: "12:00" }, NOW).ok, false);
});

test("events past midnight end on the next day; over 16h is rejected", () => {
  const r = resolveSlot({ serviceType: "event", eventDate: "2026-12-01", startTime: "20:00", endTime: "02:00" }, NOW);
  assert.ok(r.ok);
  assert.equal(r.slot.endsAt.getTime() - r.slot.startsAt.getTime(), 6 * 3600000);
  assert.equal(resolveSlot({ serviceType: "event", eventDate: "2026-12-01", startTime: "06:00", endTime: "23:30" }, NOW).ok, false);
});

test("setup and travel buffers widen the blocked window", () => {
  const r = resolveSlot({ serviceType: "wedding", eventDate: "2026-12-01", startTime: "14:00", endTime: "22:00" }, NOW);
  assert.ok(r.ok);
  assert.equal(r.slot.blockStart.toISOString(), "2026-12-01T07:30:00.000Z"); // 12:30 local (90 min setup)
  assert.equal(r.slot.blockEnd.toISOString(), "2026-12-01T18:00:00.000Z"); // 23:00 local (60 min travel)
});

test("overlap detection, including buffer-only overlaps and back-to-back slots", () => {
  const slot = (s: string, e: string, type: "nikah" | "photography" = "photography") => {
    const r = resolveSlot({ serviceType: type, eventDate: "2026-12-01", startTime: s, endTime: e }, NOW);
    assert.ok(r.ok);
    return r.slot;
  };
  assert.equal(overlaps(slot("10:00", "12:00"), slot("11:00", "13:00")), true);
  // 12:00-14:00 vs 12:30 start: buffers (30 + 30) make them collide.
  assert.equal(overlaps(slot("10:00", "12:00"), slot("12:30", "14:00")), true);
  // 10-12 (+30 → 12:30) vs 13:00 start (-30 → 12:30): touching, not overlapping.
  assert.equal(overlaps(slot("10:00", "12:00"), slot("13:00", "15:00")), false);
});

test("which statuses occupy the calendar", () => {
  const future = new Date(NOW.getTime() + 3600000);
  const past = new Date(NOW.getTime() - 3600000);
  assert.equal(isBlocking({ status: "confirmed", holdExpiresAt: null }, NOW), true);
  assert.equal(isBlocking({ status: "completed", holdExpiresAt: null }, NOW), true);
  assert.equal(isBlocking({ status: "pending", holdExpiresAt: future }, NOW), true);
  assert.equal(isBlocking({ status: "pending", holdExpiresAt: past }, NOW), false);
  assert.equal(isBlocking({ status: "pending", holdExpiresAt: null }, NOW), false);
  assert.equal(isBlocking({ status: "cancelled", holdExpiresAt: future }, NOW), false);
  assert.equal(isBlocking({ status: "declined", holdExpiresAt: null }, NOW), false);
});
