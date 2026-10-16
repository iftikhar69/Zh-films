// Signed-in customer experience and Sell/Rent listing rules against a throwaway Postgres schema
// and a mocked Clerk session. Run with: npm run test:customer
import { test, mock, after } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const baseUrl = process.env.TEST_DATABASE_URL ?? process.env.DIRECT_URL;
if (!baseUrl) throw new Error("Set DIRECT_URL (or TEST_DATABASE_URL) to a Postgres database for the customer tests.");
const testSchema = `cus_${Date.now().toString(36)}`;
const testUrl = new URL(baseUrl);
testUrl.searchParams.set("schema", testSchema);
process.env.DATABASE_URL = testUrl.toString();
process.env.DIRECT_URL = testUrl.toString();
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_x";
process.env.CLERK_SECRET_KEY = "sk_test_x";
process.env.ADMIN_EMAILS = "";
execSync("npx prisma db push --skip-generate", { env: process.env, stdio: "ignore" });

mock.module("server-only", { namedExports: {} });

type Session = { userId: string | null; admin?: boolean; email?: string; verified?: boolean; firstName?: string };
let session: Session = { userId: null };
const clerkMock = {
  namedExports: {
    auth: async () => ({ userId: session.userId }),
    currentUser: async () =>
      session.userId
        ? {
            id: session.userId,
            firstName: session.firstName ?? null,
            publicMetadata: session.admin ? { role: "admin" } : {},
            emailAddresses: session.email
              ? [{ emailAddress: session.email, verification: { status: session.verified === false ? "unverified" : "verified" } }]
              : [],
            primaryEmailAddress: session.email ? { emailAddress: session.email } : null
          }
        : null
  }
};
mock.module("@clerk/nextjs/server", clerkMock);
mock.module(pathToFileURL(createRequire(__filename).resolve("@clerk/nextjs/server")).href, clerkMock);

let prisma: typeof import("../lib/prisma").prisma;
after(async () => {
  await prisma?.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
  await prisma?.$disconnect();
});

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
const route = async (mod: string) => (await import(mod)) as Record<string, Handler>;
async function call(h: Handler, params: Record<string, string> = {}, init?: { method?: string; body?: unknown }) {
  const res = await h(
    new Request("http://x/api", {
      method: init?.method ?? "GET",
      ...(init?.body !== undefined ? { body: JSON.stringify(init.body), headers: { "Content-Type": "application/json" } } : {})
    }),
    { params: Promise.resolve(params) }
  );
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json, headers: res.headers };
}

const ADMIN: Session = { userId: "user_admin", admin: true, email: "owner@example.com" };
const AMINA: Session = { userId: "user_a", email: "amina@example.com", firstName: "Amina" };
const BILAL: Session = { userId: "user_b", email: "bilal@example.com" };

const booking = (code: string, email: string, eventDate: string) => ({
  confirmationCode: code,
  names: "Amina & Haris",
  city: "Gilgit",
  eventDate,
  coverage: "Full day",
  deliverables: "Film",
  email,
  phone: "+923000000000"
});

test("setup", async () => {
  prisma = (await import("../lib/prisma")).prisma;
  await prisma.booking.create({ data: booking("ZH-A1", "amina@example.com", "2099-05-01") });
  await prisma.booking.create({ data: booking("ZH-B1", "bilal@example.com", "2099-06-01") });
  const g = await prisma.familyGallery.create({ data: { title: "Amina's walima", members: { create: { email: "amina@example.com" } } } });
  await prisma.familyGallery.create({ data: { title: "Archived", status: "archived", members: { create: { email: "amina@example.com" } } } });
  assert.ok(g.id);
  const gear = (slug: string, status: string, listingType: string) =>
    prisma.gearItem.create({
      data: { slug, name: slug, brand: "", category: "camera", listingType, status, priceLabel: "", description: "", image: `/x/${slug}.webp` }
    });
  await gear("draft-cam", "draft", "both");
  await gear("live-rent", "available", "rent");
  await gear("live-sell", "available", "sell");
});

test("/api/me: anonymous is signed out, never admin, and not cacheable", async () => {
  const { GET } = await route("../app/api/me/route");
  session = { userId: null };
  const r = await call(GET);
  assert.equal(r.status, 200);
  assert.equal(r.json.signedIn, false);
  assert.equal(r.json.isAdmin, false);
  assert.equal(r.json.bookings, undefined);
  assert.match(r.headers.get("cache-control") ?? "", /no-store/);
});

test("/api/me: a customer sees only their own bookings and active galleries, and is not admin", async () => {
  const { GET } = await route("../app/api/me/route");
  session = AMINA;
  const r = await call(GET);
  assert.equal(r.json.signedIn, true);
  assert.equal(r.json.isAdmin, false);
  assert.equal(r.json.firstName, "Amina");
  assert.equal(r.json.bookings, 1);
  assert.equal(r.json.galleries, 1);
  assert.equal((r.json.next as { confirmationCode: string }).confirmationCode, "ZH-A1");

  session = BILAL;
  const b = await call(GET);
  assert.equal(b.json.galleries, 0);
  assert.equal((b.json.next as { confirmationCode: string }).confirmationCode, "ZH-B1");

  assert.equal(r.json.office, undefined, "customers never receive office counts");

  session = ADMIN;
  const admin = await call(GET);
  assert.equal(admin.json.isAdmin, true);
  assert.deepEqual(Object.keys(admin.json.office as object).sort(), ["paymentsToVerify", "pending", "upcoming"]);
  assert.equal((admin.json.office as { pending: number }).pending, 2, "both seeded requests are pending");
});

test("/api/me: an unverified email claims no bookings and sees no galleries", async () => {
  const { GET } = await route("../app/api/me/route");
  await prisma.booking.create({ data: booking("ZH-U1", "unverified@example.com", "2099-07-01") });
  session = { userId: "user_u", email: "unverified@example.com", verified: false };
  const r = await call(GET);
  assert.equal(r.json.emailVerified, false);
  assert.equal(r.json.bookings, 0);
  assert.equal(r.json.galleries, 0);
  assert.equal((await prisma.booking.findUnique({ where: { confirmationCode: "ZH-U1" } }))?.clerkUserId, null);
});

test("/api/account: 401 when signed out; a customer gets their bookings and galleries only", async () => {
  const { GET } = await route("../app/api/account/route");
  session = { userId: null };
  assert.equal((await call(GET)).status, 401);

  session = AMINA;
  const r = await call(GET);
  assert.equal(r.status, 200);
  const codes = (r.json.bookings as { confirmationCode: string }[]).map((b) => b.confirmationCode);
  assert.deepEqual(codes, ["ZH-A1"]);
  const galleries = r.json.galleries as { title: string }[];
  assert.deepEqual(galleries.map((g) => g.title), ["Amina's walima"]);
  assert.match(r.headers.get("cache-control") ?? "", /no-store/);
});

test("Admin gear routes refuse anonymous visitors and customers", async () => {
  const list = await route("../app/api/admin/gear/route");
  const one = await route("../app/api/admin/gear/[id]/route");
  const item = await prisma.gearItem.findUniqueOrThrow({ where: { slug: "draft-cam" } });
  session = { userId: null };
  assert.equal((await call(list.GET)).status, 401);
  session = AMINA;
  assert.equal((await call(list.GET)).status, 403);
  assert.equal((await call(list.POST, {}, { method: "POST", body: { name: "Mine" } })).status, 403);
  assert.equal((await call(one.PATCH, { id: item.id }, { method: "PATCH", body: { status: "available" } })).status, 403);
  assert.equal((await call(one.DELETE, { id: item.id }, { method: "DELETE" })).status, 403);
  assert.equal((await prisma.gearItem.findUniqueOrThrow({ where: { id: item.id } })).status, "draft");
});

test("Sell and Rent enquiries refuse drafts and wrong listing types, and store the database name", async () => {
  const sell = await route("../app/api/sell/route");
  const rent = await route("../app/api/rent/route");
  const id = async (slug: string) => (await prisma.gearItem.findUniqueOrThrow({ where: { slug } })).id;
  const who = { clientName: "Amina", phone: "+923000000000" };
  session = { userId: null };

  assert.equal((await call(sell.POST, {}, { method: "POST", body: { ...who, gearId: await id("draft-cam") } })).status, 404);
  assert.equal((await call(rent.POST, {}, { method: "POST", body: { ...who, gearId: await id("draft-cam"), startDate: "2099-01-01" } })).status, 404);
  assert.equal((await call(sell.POST, {}, { method: "POST", body: { ...who, gearId: await id("live-rent") } })).status, 404);
  assert.equal(
    (await call(rent.POST, {}, { method: "POST", body: { ...who, gearId: await id("live-rent"), startDate: "2099-01-05", endDate: "2099-01-01" } })).status,
    400
  );

  const ok = await call(sell.POST, {}, { method: "POST", body: { ...who, gearId: await id("live-sell"), gearName: "Spoofed" } });
  assert.equal(ok.status, 200);
  assert.equal((await prisma.sellInquiry.findUniqueOrThrow({ where: { id: ok.json.id as string } })).gearName, "live-sell");
});
