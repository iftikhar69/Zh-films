// End-to-end workflow test against a throwaway SQLite copy, a mocked Clerk admin
// session and a local fake Resend server. Run with: npm run test:workflow
import { test, mock, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(path.join(tmpdir(), "zh-workflow-"));
process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
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
});

after(async () => {
  await prisma.$disconnect();
  server.close();
});

const DATE = (() => {
  const d = new Date(Date.now() + 30 * 86400000);
  return d.toISOString().slice(0, 10);
})();

async function request(names: string, startTime: string, endTime: string, email = "couple@example.com") {
  const res = await createBooking.POST(
    new Request("http://x/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        names, city: "Lahore", serviceType: "photography", eventDate: DATE, startTime, endTime,
        coverage: "Full day", deliverables: "Album", email, phone: "03001234567"
      })
    }) as never
  );
  const json = await res.json();
  assert.equal(res.status, 200, JSON.stringify(json));
  return prisma.booking.findUniqueOrThrow({ where: { id: json.booking.id } });
}

async function act(id: string, body: object) {
  const res = await adminBooking.POST(
    new Request("http://x", { method: "POST", body: JSON.stringify(body) }) as never,
    { params: Promise.resolve({ id }) } as never
  );
  return { status: res.status, json: await res.json() };
}

test("signed-out and non-admin users cannot run admin actions", async () => {
  const b = await request("Auth Check", "08:00", "09:00");
  session = { userId: null, admin: false };
  assert.equal((await act(b.id, { action: "confirm" })).status, 401);
  session = { userId: "user_customer", admin: false };
  assert.equal((await act(b.id, { action: "confirm" })).status, 403);
  assert.equal((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).status, "pending");
});

test("new request is pending review, has no hold, and emails customer + owner", async () => {
  sent.length = 0;
  const b = await request("Ayesha & Bilal", "14:00", "16:00");
  assert.equal(b.status, "pending");
  assert.equal(b.holdExpiresAt, null);
  assert.ok(sent.some((m) => m.to.includes("couple@example.com") && !/confirmed|reserved/i.test(m.subject)));
  assert.ok(sent.some((m) => m.to.includes("owner@example.com")));
  // A plain pending request does not block the same time for someone else.
  const other = await request("Overlap Pending", "14:30", "15:30", "other@example.com");
  assert.equal(other.status, "pending");
});

test("overlapping bookings cannot both be confirmed; cancelling releases the time", async () => {
  session = { userId: "user_owner", admin: true };
  const a = await prisma.booking.findFirstOrThrow({ where: { names: "Ayesha & Bilal" } });
  const b = await prisma.booking.findFirstOrThrow({ where: { names: "Overlap Pending" } });
  sent.length = 0;
  assert.equal((await act(a.id, { action: "confirm" })).status, 200);
  assert.ok(sent.some((m) => m.to.includes("couple@example.com") && /confirmed/i.test(m.subject)));
  const clash = await act(b.id, { action: "confirm" });
  assert.equal(clash.status, 409);
  assert.equal((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).status, "pending");

  // The public form also refuses the confirmed time.
  const res = await createBooking.POST(new Request("http://x", { method: "POST", body: JSON.stringify({
    names: "Late Comer", city: "Lahore", serviceType: "photography", eventDate: DATE, startTime: "15:00",
    endTime: "15:30", coverage: "Full day", deliverables: "Album", email: "x@example.com", phone: "03001234567" }) }) as never);
  assert.equal(res.status, 409);

  assert.equal((await act(a.id, { action: "cancel", reason: "Family change" })).status, 200);
  assert.equal((await act(b.id, { action: "confirm" })).status, 200);
});

test("owner holds block the slot and expire", async () => {
  const h = await request("Hold Couple", "18:00", "19:00", "hold@example.com");
  const rival = await request("Hold Rival", "18:30", "19:30", "rival@example.com");
  assert.equal((await act(h.id, { action: "hold", hours: 2 })).status, 200);
  const held = await prisma.booking.findUniqueOrThrow({ where: { id: h.id } });
  assert.ok(held.holdExpiresAt && held.holdExpiresAt > new Date());
  assert.equal((await act(rival.id, { action: "confirm" })).status, 409);

  await prisma.booking.update({ where: { id: h.id }, data: { holdExpiresAt: new Date(Date.now() - 60000) } });
  sent.length = 0;
  await runReminders();
  assert.ok(sent.some((m) => m.to.includes("hold@example.com")), "hold-expired notice sent");
  const count = sent.length;
  await runReminders();
  assert.equal(sent.length, count, "reminders are deduplicated");
  assert.equal((await act(rival.id, { action: "confirm" })).status, 200);
});

test("payment submission is never auto-verified; only admins verify", async () => {
  const b = await request("Pay Couple", "06:00", "07:00", "pay@example.com");
  const { getSettings, saveSettings } = await import("../lib/settings");
  const s = await getSettings();
  s.payments.easypaisa.enabled = true;
  s.payments.easypaisa.accountTitle = "ZH Films";
  s.payments.easypaisa.accountNumber = "03000000000";
  await saveSettings(s, "test");

  assert.equal((await act(b.id, { action: "set_quote", quotedAmount: 100000, advanceAmount: 30000 })).status, 200);

  const submit = async (token: string | null, file?: File) => {
    const form = new FormData();
    if (token) form.set("token", token);
    form.set("method", "easypaisa");
    form.set("amount", "30000");
    form.set("reference", `TXN${Math.floor(Math.random() * 1e9)}`);
    if (file) form.set("receipt", file);
    const res = await payments.POST(new Request("http://x", { method: "POST", body: form }) as never,
      { params: Promise.resolve({ code: b.confirmationCode }) } as never);
    return { status: res.status, json: await res.json() };
  };

  session = { userId: null, admin: false };
  assert.equal((await submit(null)).status, 404, "no token, no access");
  assert.equal((await submit("wrong-token")).status, 404);
  const fake = new File([Buffer.from("<script>alert(1)</script>")], "r.png", { type: "image/png" });
  assert.equal((await submit(b.accessToken, fake)).status, 400, "content-sniffed receipt rejected");
  const png = new File([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])], "r.png", { type: "image/png" });
  sent.length = 0;
  const ok = await submit(b.accessToken, png);
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  assert.ok(sent.some((m) => m.to.includes("owner@example.com")));

  const after = await prisma.booking.findUniqueOrThrow({ where: { id: b.id }, include: { payments: true } });
  assert.equal(after.paymentStatus, "submitted");
  assert.equal(after.status, "pending");
  const p = after.payments[0];
  assert.equal(p.status, "submitted");
  assert.equal(p.verifiedAt, null);

  const decide = async (body: object) => {
    const res = await adminPayment.POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }) as never,
      { params: Promise.resolve({ id: p.id }) } as never);
    return res.status;
  };
  assert.equal(await decide({ action: "verify" }), 401);
  session = { userId: "user_customer", admin: false };
  assert.equal(await decide({ action: "verify" }), 403);
  session = { userId: "user_owner", admin: true };
  sent.length = 0;
  assert.equal(await decide({ action: "verify" }), 200);
  const verified = await prisma.payment.findUniqueOrThrow({ where: { id: p.id } });
  assert.equal(verified.status, "verified");
  assert.equal(verified.verifiedBy, "owner@example.com");
  assert.ok(verified.verifiedAt);
  const bk = await prisma.booking.findUniqueOrThrow({ where: { id: b.id } });
  assert.equal(bk.paymentStatus, "paid");
  assert.equal(bk.status, "pending", "payment never changes booking status");
  assert.ok(sent.some((m) => m.to.includes("pay@example.com")));
});

test("email failures are logged, not thrown", async () => {
  const { sendEmail } = await import("../lib/email");
  const url = process.env.RESEND_API_URL;
  process.env.RESEND_API_URL = "http://127.0.0.1:1";
  const r = await sendEmail({ to: "a@example.com", subject: "x", text: "y", dedupeKey: "fail-test", kind: "test" } as never);
  process.env.RESEND_API_URL = url;
  assert.equal(r.status, "failed");
  assert.equal((await prisma.emailLog.findUniqueOrThrow({ where: { dedupeKey: "fail-test" } })).status, "failed");
});
