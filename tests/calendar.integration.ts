// Busy / Unavailable dates: persistence, ranges, overlap and conflict checks.
// Run with: npm run test:calendar
import { test, mock, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(path.join(tmpdir(), "zh-cal-"));
const baseUrl = process.env.TEST_DATABASE_URL ?? process.env.DIRECT_URL;
if (!baseUrl) throw new Error("Set DIRECT_URL (or TEST_DATABASE_URL) to a Postgres database for the workflow tests.");
const testSchema = `cal_${Date.now().toString(36)}`;
const testUrl = new URL(baseUrl);
testUrl.searchParams.set("schema", testSchema);
process.env.DATABASE_URL = testUrl.toString();
process.env.DIRECT_URL = testUrl.toString();
process.env.RECEIPTS_DIR = path.join(dir, "receipts");
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_x";
process.env.CLERK_SECRET_KEY = "sk_test_x";
process.env.RESEND_API_KEY = "re_test";
process.env.EMAIL_FROM = "ZH Films <bookings@example.com>";
process.env.OWNER_NOTIFY_EMAIL = "owner@example.com";
process.env.ADMIN_EMAILS = "";
execSync("npx prisma db push --skip-generate", { env: process.env, stdio: "ignore" });

mock.module("server-only", { namedExports: {} });

let session: { userId: string | null; admin: boolean } = { userId: null, admin: false };
const clerkMock = {
  namedExports: {
    auth: async () => ({ userId: session.userId }),
    currentUser: async () =>
      session.userId
        ? {
            id: session.userId,
            publicMetadata: session.admin ? { role: "admin" } : {},
            emailAddresses: [{ emailAddress: "owner@example.com", verification: { status: "verified" } }],
            primaryEmailAddress: { emailAddress: "owner@example.com" }
          }
        : null
  }
};
mock.module("@clerk/nextjs/server", clerkMock);
mock.module(pathToFileURL(createRequire(__filename).resolve("@clerk/nextjs/server")).href, clerkMock);

const sent: { to: string[]; subject: string; text: string }[] = [];
let server: Server;

type Mod = Record<string, (...a: never[]) => Promise<Response>>;
let createBooking: Mod, adminBooking: Mod, payments: Mod, adminPayment: Mod;
let prisma: typeof import("../lib/prisma").prisma;
let runReminders: typeof import("../lib/reminders").runReminders;
let blocked: Mod;
let dayRange: typeof import("../lib/booking-availability").dayRange;

before(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      sent.push(JSON.parse(body));
      res.writeHead(200, { "Content-Type": "application/json" }).end('{"id":"fake"}');
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address();
  process.env.RESEND_API_URL = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;

  createBooking = await import("../app/api/bookings/route");
  adminBooking = await import("../app/api/admin/bookings/[id]/route");
  payments = await import("../app/api/bookings/[code]/payments/route");
  adminPayment = await import("../app/api/admin/payments/[id]/route");
  ({ prisma } = await import("../lib/prisma"));
  ({ runReminders } = await import("../lib/reminders"));
  blocked = await import("../app/api/admin/blocked-dates/route");
  ({ dayRange } = await import("../lib/booking-availability"));
});

after(async () => {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
  await prisma.$disconnect();
  server.close();
});

const DATE = (() => {
  const d = new Date(Date.now() + 30 * 86400000);
  return d.toISOString().slice(0, 10);
})();

async function request(names: string, startTime: string, endTime: string, email = "couple@example.com", date = DATE) {
  const res = await createBooking.POST(
    new Request("http://x/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        names, city: "Lahore", serviceType: "photography", eventDate: date, startTime, endTime,
        coverage: "Full day", deliverables: "Album", email, phone: "03001234567"
      })
    }) as never
  );
  return { status: res.status, json: await res.json() };
}

async function act(id: string, body: object) {
  const res = await adminBooking.POST(
    new Request("http://x", { method: "POST", body: JSON.stringify(body) }) as never,
    { params: Promise.resolve({ id }) } as never
  );
  return { status: res.status, json: await res.json() };
}

const plus = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

async function block(body: object) {
  const res = await blocked.POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }) as never);
  return { status: res.status, json: await res.json() };
}
async function unblock(id: string) {
  const res = await blocked.DELETE(new Request(`http://x?id=${id}`, { method: "DELETE" }) as never);
  return res.status;
}

test("dayRange covers whole local days and rejects bad ranges", () => {
  const r = dayRange("2027-03-01", "2027-03-03");
  assert.equal((r.blockEnd.getTime() - r.blockStart.getTime()) / 86400000, 3);
  assert.throws(() => dayRange("2027-03-05", "2027-03-01"));
  assert.throws(() => dayRange("2027-3-5", "2027-03-06"));
  assert.throws(() => dayRange("2027-01-01", "2028-06-01"));
});

test("only admins can block or unblock dates", async () => {
  session = { userId: null, admin: false };
  assert.equal((await block({ startDate: DATE, endDate: DATE })).status, 401);
  session = { userId: "user_customer", admin: false };
  assert.equal((await block({ startDate: DATE, endDate: DATE })).status, 403);
  assert.equal(await prisma.blockedDate.count(), 0);
});

test("a busy range is saved and blocks new requests on every day in it", async () => {
  session = { userId: "user_owner", admin: true };
  const from = plus(40), mid = plus(41), to = plus(42);
  const res = await block({ startDate: from, endDate: to, reason: "Travelling" });
  assert.equal(res.status, 200, JSON.stringify(res.json));
  const row = await prisma.blockedDate.findUniqueOrThrow({ where: { id: res.json.block.id } });
  assert.equal(row.startDate, from);
  assert.equal(row.endDate, to);
  for (const d of [from, mid, to]) {
    const r = await request("Blocked Day", "10:00", "12:00", "x@example.com", d);
    assert.equal(r.status, 409, `${d} should be unavailable`);
  }
  const after = await request("Day After", "10:00", "12:00", "x@example.com", plus(43));
  assert.equal(after.status, 200, JSON.stringify(after.json));
});

test("public day availability shows busy ranges without the private reason", async () => {
  const { busyRangesForDate } = await import("../lib/booking-availability");
  const busy = await busyRangesForDate(plus(41));
  assert.deepEqual(busy, [{ from: "00:00", to: "24:00" }]);
  assert.ok(!JSON.stringify(busy).includes("Travelling"));
});

test("blocking over a confirmed booking is refused unless forced", async () => {
  session = { userId: "user_owner", admin: true };
  const d = plus(50);
  const r = await request("Confirmed Couple", "14:00", "16:00", "c@example.com", d);
  assert.equal(r.status, 200);
  assert.equal((await act(r.json.booking.id, { action: "confirm", withoutAdvance: true })).status, 200);
  const refused = await block({ startDate: plus(49), endDate: plus(51) });
  assert.equal(refused.status, 409);
  assert.equal(refused.json.bookings[0].names, "Confirmed Couple");
  const forced = await block({ startDate: d, endDate: d, force: true });
  assert.equal(forced.status, 200);
});

test("a pending request without a hold does not stop blocking, but cannot be confirmed into a busy date", async () => {
  session = { userId: "user_owner", admin: true };
  const d = plus(60);
  const r = await request("Waiting Couple", "09:00", "11:00", "w@example.com", d);
  assert.equal(r.status, 200);
  const res = await block({ startDate: d, endDate: d });
  assert.equal(res.status, 200);
  const confirm = await act(r.json.booking.id, { action: "confirm", withoutAdvance: true });
  assert.equal(confirm.status, 409, JSON.stringify(confirm.json));
  assert.equal(await unblock(res.json.block.id), 200);
  assert.equal(await unblock(res.json.block.id), 404);
  assert.equal((await act(r.json.booking.id, { action: "confirm", withoutAdvance: true })).status, 200);
});
