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
  assert.equal((await act(b.id, { action: "confirm", withoutAdvance: true })).status, 401);
  session = { userId: "user_customer", admin: false };
  assert.equal((await act(b.id, { action: "confirm", withoutAdvance: true })).status, 403);
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
  assert.equal((await act(a.id, { action: "confirm", withoutAdvance: true })).status, 200);
  assert.ok(sent.some((m) => m.to.includes("couple@example.com") && /confirmed/i.test(m.subject)));
  const clash = await act(b.id, { action: "confirm", withoutAdvance: true });
  assert.equal(clash.status, 409);
  assert.equal((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).status, "pending");

  // The public form also refuses the confirmed time.
  const res = await createBooking.POST(new Request("http://x", { method: "POST", body: JSON.stringify({
    names: "Late Comer", city: "Lahore", serviceType: "photography", eventDate: DATE, startTime: "15:00",
    endTime: "15:30", coverage: "Full day", deliverables: "Album", email: "x@example.com", phone: "03001234567" }) }) as never);
  assert.equal(res.status, 409);

  assert.equal((await act(a.id, { action: "cancel", reason: "Family change" })).status, 200);
  assert.equal((await act(b.id, { action: "confirm", withoutAdvance: true })).status, 200);
});

test("owner holds block the slot and expire", async () => {
  const h = await request("Hold Couple", "18:00", "19:00", "hold@example.com");
  const rival = await request("Hold Rival", "18:30", "19:30", "rival@example.com");
  assert.equal((await act(h.id, { action: "hold", hours: 2 })).status, 200);
  const held = await prisma.booking.findUniqueOrThrow({ where: { id: h.id } });
  assert.ok(held.holdExpiresAt && held.holdExpiresAt > new Date());
  assert.equal((await act(rival.id, { action: "confirm", withoutAdvance: true })).status, 409);

  await prisma.booking.update({ where: { id: h.id }, data: { holdExpiresAt: new Date(Date.now() - 60000) } });
  sent.length = 0;
  await runReminders();
  assert.ok(sent.some((m) => m.to.includes("hold@example.com")), "hold-expired notice sent");
  const count = sent.length;
  await runReminders();
  assert.equal(sent.length, count, "reminders are deduplicated");
  assert.equal((await act(rival.id, { action: "confirm", withoutAdvance: true })).status, 200);
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
  const early = await act(b.id, { action: "confirm" });
  assert.equal(early.status, 409, "cannot confirm before the advance is verified");
  assert.equal(early.json.code, "advance_unpaid");

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
  assert.equal((await act(b.id, { action: "confirm" })).status, 200, "confirm allowed once the advance is verified");
});

test("customer can cancel a pending request with a message, not a confirmed one", async () => {
  const cancel = (await import("../app/api/bookings/[code]/cancel/route")) as unknown as Mod;
  const call = async (code: string, body: object) => {
    const res = await cancel.POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }) as never,
      { params: Promise.resolve({ code }) } as never);
    return res.status;
  };
  const b = await request("Cancel Couple", "08:00", "09:00", "cancel@example.com");
  session = { userId: null, admin: false };
  assert.equal(await call(b.confirmationCode, { token: "wrong", message: "Plans changed" }), 404);
  assert.equal(await call(b.confirmationCode, { token: b.accessToken, message: "" }), 400, "message required");
  sent.length = 0;
  assert.equal(await call(b.confirmationCode, { token: b.accessToken, message: "We moved the date" }), 200);
  assert.equal((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).status, "cancelled");
  assert.ok(sent.some((m) => m.to.includes("owner@example.com") && m.text.includes("We moved the date")));

  session = { userId: "user_owner", admin: true };
  const c = await request("Confirmed Couple", "10:00", "11:00", "conf@example.com");
  assert.equal((await act(c.id, { action: "confirm", withoutAdvance: true })).status, 200);
  assert.equal(await call(c.confirmationCode, { token: c.accessToken, message: "Please cancel" }), 409);
  assert.equal((await prisma.booking.findUniqueOrThrow({ where: { id: c.id } })).status, "confirmed");
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

const DATE2 = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10);
const DATE3 = new Date(Date.now() + 41 * 86400000).toISOString().slice(0, 10);

async function post(body: object) {
  const res = await createBooking.POST(new Request("http://x/api/bookings", { method: "POST", body: JSON.stringify(body) }) as never);
  return { status: res.status, json: await res.json() };
}

const wedding = (over: object = {}) => ({
  kind: "wedding_package",
  packageId: "premium",
  names: "Hina & Saad",
  city: "Lahore",
  phone: "03001234567",
  email: "",
  functions: [
    { type: "mehndi", eventDate: DATE2, startTime: "19:00", endTime: "23:00", venue: "Home" },
    { type: "baraat", eventDate: DATE3, startTime: "14:00", endTime: "20:00", venue: "PC Hotel" }
  ],
  ...over
});

async function putCatalog(body: unknown) {
  const catalogRoute = (await import("../app/api/admin/catalog/route")) as Mod;
  const res = await catalogRoute.PUT(new Request("http://x", { method: "PUT", body: JSON.stringify(body) }) as never);
  return { status: res.status, json: await res.json() };
}

test("package booking: server computes the total, ignores browser totals, saves every function", async () => {
  session = { userId: "user_owner", admin: true };
  const { DEFAULT_CATALOG } = await import("../lib/catalog");
  const saved = await putCatalog({
    ...DEFAULT_CATALOG,
    addons: [
      { id: "drone", name: "Drone coverage", price: 25000, description: "", enabled: true },
      { id: "album", name: "Extra album", price: 15000, description: "", enabled: false }
    ]
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.json));
  session = { userId: null, admin: false };

  const r = await post(wedding({ addonIds: ["drone"], estimatedTotal: 1, packagePrice: 1, whatsapp: true, budget: "Around 160k" }));
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.estimate.total, 175000);
  const b = await prisma.booking.findUniqueOrThrow({ where: { id: r.json.booking.id }, include: { functions: { orderBy: { sortOrder: "asc" } } } });
  assert.equal(b.kind, "wedding_package");
  assert.equal(b.packageName, "Premium Wedding Package");
  assert.equal(b.packagePrice, 150000);
  assert.equal(b.estimatedTotal, 175000);
  assert.equal(b.quotedAmount, null, "no final price until an admin sets one");
  assert.equal(b.whatsappRequested, true);
  assert.deepEqual(b.functions.map((f) => [f.type, f.eventDate]), [["mehndi", DATE2], ["baraat", DATE3]]);
  assert.equal(b.status, "pending");

  const text: string = r.json.whatsappText;
  assert.match(text, new RegExp(b.confirmationCode));
  assert.match(text, /Mehndi/);
  assert.match(text, /Baraat/);
  assert.match(text, /Drone coverage/);
  assert.match(text, /PKR 175,000/);

  assert.equal((await post(wedding({ addonIds: ["album"] }))).status, 400, "disabled add-on refused");
  assert.equal((await post(wedding({ packageId: "gold" }))).status, 400, "unknown package refused");
  const clash = await post(wedding({
    functions: [
      { type: "nikah", eventDate: DATE2, startTime: "11:00", endTime: "15:00" },
      { type: "baraat", eventDate: DATE2, startTime: "14:00", endTime: "20:00" }
    ]
  }));
  assert.equal(clash.status, 400, "a booking's own functions may not overlap");
});

test("multi-function conflicts: a confirmed second function blocks others and confirm re-checks every function", async () => {
  session = { userId: "user_owner", admin: true };
  const a = await prisma.booking.findFirstOrThrow({ where: { names: "Hina & Saad" } });
  assert.equal((await act(a.id, { action: "confirm", withoutAdvance: true })).status, 200);

  // Overlaps the Baraat (second function), not the Mehndi stored on the booking row.
  const event = await post({ kind: "event", eventType: "birthday", names: "Birthday", city: "Lahore", phone: "03001112223", eventDate: DATE3, startTime: "16:00", endTime: "18:00" });
  assert.equal(event.status, 409);

  const other = await post(wedding({ names: "Second Couple", functions: [{ type: "walima", eventDate: DATE3, startTime: "08:00", endTime: "10:00" }] }));
  assert.equal(other.status, 200, JSON.stringify(other.json));
  await prisma.bookingFunction.updateMany({ where: { bookingId: other.json.booking.id }, data: { blockStart: new Date(Date.parse(`${DATE3}T10:00:00Z`)), blockEnd: new Date(Date.parse(`${DATE3}T12:00:00Z`)) } });
  assert.equal((await act(other.json.booking.id, { action: "confirm", withoutAdvance: true })).status, 409, "overlap found on a function slot");
});

test("event booking in advance has its own type and is pending review", async () => {
  session = { userId: null, admin: false };
  const r = await post({ kind: "event", eventType: "corporate", names: "Acme Ltd", city: "Expo Centre", phone: "03001112223", eventDate: DATE2, startTime: "09:00", endTime: "12:00", coverage: "Videography", customDeal: true });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const b = await prisma.booking.findUniqueOrThrow({ where: { id: r.json.booking.id } });
  assert.equal(b.kind, "event");
  assert.equal(b.eventType, "corporate");
  assert.equal(b.serviceType, "event");
  assert.equal(b.packagePrice, null);
  assert.equal(b.status, "pending");
  assert.match(r.json.whatsappText, /Corporate event/);
  assert.equal((await post({ kind: "event", names: "No type", city: "Lahore", phone: "03001112223", eventDate: DATE2, startTime: "09:00", endTime: "12:00" })).status, 400);
});

test("only admins edit prices; new prices apply to new requests only; quotes record discounts", async () => {
  const { DEFAULT_CATALOG } = await import("../lib/catalog");
  const edited = { ...DEFAULT_CATALOG, packages: DEFAULT_CATALOG.packages.map((p) => (p.id === "standard" ? { ...p, price: 110000, inclusions: ["Baraat coverage"] } : p)), addons: [] };
  session = { userId: null, admin: false };
  assert.equal((await putCatalog(edited)).status, 401);
  session = { userId: "user_customer", admin: false };
  assert.equal((await putCatalog(edited)).status, 403);
  session = { userId: "user_owner", admin: true };
  assert.equal((await putCatalog({ ...edited, packages: edited.packages.slice(0, 2) })).status, 400, "all three packages required");
  assert.equal((await putCatalog({ ...edited, packages: edited.packages.map((p) => ({ ...p, price: -5 })) })).status, 400);
  assert.equal((await putCatalog(edited)).status, 200);

  const before = await prisma.booking.findFirstOrThrow({ where: { names: "Hina & Saad" } });
  assert.equal(before.packagePrice, 150000, "existing requests keep their price");

  session = { userId: null, admin: false };
  const r = await post(wedding({ packageId: "standard", names: "Price Check", functions: [{ type: "nikah", eventDate: DATE2, startTime: "08:00", endTime: "10:00" }] }));
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.estimate.total, 110000);

  session = { userId: "user_owner", admin: true };
  assert.equal((await act(r.json.booking.id, { action: "set_quote", quotedAmount: 95000, advanceAmount: 30000, note: "Agreed on WhatsApp" })).status, 200);
  const q = await prisma.booking.findUniqueOrThrow({ where: { id: r.json.booking.id }, include: { events: true } });
  assert.equal(q.quotedAmount, 95000);
  assert.equal(q.estimatedTotal, 110000);
  assert.equal(q.status, "pending", "a quote doesn't confirm the booking");
  assert.ok(q.events.some((e) => /discount of PKR 15,000/.test(e.message) && /Agreed on WhatsApp/.test(e.message)));
});
