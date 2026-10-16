// Private gallery authorization against a throwaway Postgres schema, a mocked Clerk session and a
// local fake of the Supabase Storage API. Run with: npm run test:galleries
import { test, mock, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const baseUrl = process.env.TEST_DATABASE_URL ?? process.env.DIRECT_URL;
if (!baseUrl) throw new Error("Set DIRECT_URL (or TEST_DATABASE_URL) to a Postgres database for the gallery tests.");
const testSchema = `gal_${Date.now().toString(36)}`;
const testUrl = new URL(baseUrl);
testUrl.searchParams.set("schema", testSchema);
process.env.DATABASE_URL = testUrl.toString();
process.env.DIRECT_URL = testUrl.toString();
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_x";
process.env.CLERK_SECRET_KEY = "sk_test_x";
process.env.ADMIN_EMAILS = "";
process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
execSync("npx prisma db push --skip-generate", { env: process.env, stdio: "ignore" });

mock.module("server-only", { namedExports: {} });

type Session = { userId: string | null; admin?: boolean; email?: string; verified?: boolean };
let session: Session = { userId: null };
const clerkMock = {
  namedExports: {
    auth: async () => ({ userId: session.userId }),
    currentUser: async () =>
      session.userId
        ? {
            id: session.userId,
            publicMetadata: session.admin ? { role: "admin" } : {},
            emailAddresses: session.email ? [{ emailAddress: session.email, verification: { status: session.verified === false ? "unverified" : "verified" } }] : [],
            primaryEmailAddress: session.email ? { emailAddress: session.email } : null
          }
        : null
  }
};
mock.module("@clerk/nextjs/server", clerkMock);
mock.module(pathToFileURL(createRequire(__filename).resolve("@clerk/nextjs/server")).href, clerkMock);

/** Minimal in-memory Supabase Storage: upload, sign, signed upload, download, delete. */
const objects = new Map<string, Buffer>();
let server: Server;
before(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      const url = new URL(req.url!, "http://x");
      const p = url.pathname.replace(/^\/storage\/v1/, "");
      const authed = req.headers.authorization === "Bearer sb_secret_test";
      const send = (code: number, json: unknown) => res.writeHead(code, { "Content-Type": "application/json" }).end(JSON.stringify(json));
      if (p.startsWith("/object/public/family/")) return send(400, { error: "Bucket not public" });
      if (!authed && !p.startsWith("/object/upload/sign/")) return send(401, { error: "unauthorized" });
      let m: RegExpMatchArray | null;
      if (req.method === "POST" && (m = p.match(/^\/object\/upload\/sign\/(\w[\w-]*)\/(.+)$/))) return send(200, { url: `/object/upload/sign/${m[1]}/${m[2]}?token=t` });
      if (req.method === "PUT" && (m = p.match(/^\/object\/upload\/sign\/(\w[\w-]*)\/(.+)$/))) {
        objects.set(`${m[1]}/${m[2]}`, body);
        return send(200, { Key: m[2] });
      }
      if (req.method === "POST" && (m = p.match(/^\/object\/sign\/(\w[\w-]*)$/))) {
        const { paths } = JSON.parse(body.toString()) as { paths: string[] };
        return send(200, paths.map((path) => ({ path, signedURL: objects.has(`${m![1]}/${path}`) ? `/object/sign/${m![1]}/${path}?token=signed` : null })));
      }
      if (req.method === "POST" && (m = p.match(/^\/object\/(\w[\w-]*)\/(.+)$/))) {
        objects.set(`${m[1]}/${m[2]}`, body);
        return send(200, { Key: m[2] });
      }
      if (req.method === "GET" && (m = p.match(/^\/object\/authenticated\/(\w[\w-]*)\/(.+)$/))) {
        const o = objects.get(`${m[1]}/${m[2]}`);
        return o ? res.writeHead(200).end(o) : send(404, { error: "not found" });
      }
      if (req.method === "DELETE" && (m = p.match(/^\/object\/(\w[\w-]*)$/))) {
        for (const k of (JSON.parse(body.toString()) as { prefixes: string[] }).prefixes) objects.delete(`${m[1]}/${k}`);
        return send(200, []);
      }
      send(404, { error: `unhandled ${req.method} ${p}` });
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address();
  process.env.SUPABASE_URL = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
});

let prisma: typeof import("../lib/prisma").prisma;
after(async () => {
  await prisma?.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
  await prisma?.$disconnect();
  server.close();
});

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
const route = async (mod: string) => (await import(mod)) as Record<string, Handler>;
async function call(h: Handler, params: Record<string, string>, init?: { method?: string; body?: unknown; url?: string }) {
  const res = await h(
    new Request(init?.url ?? "http://x/api", {
      method: init?.method ?? "GET",
      ...(init?.body !== undefined ? { body: JSON.stringify(init.body), headers: { "Content-Type": "application/json" } } : {})
    }),
    { params: Promise.resolve(params) }
  );
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, location: res.headers.get("location"), headers: res.headers };
}

const ADMIN: Session = { userId: "user_admin", admin: true, email: "owner@example.com" };
const FAMILY_A: Session = { userId: "user_a", email: "amina@example.com" };
const FAMILY_B: Session = { userId: "user_b", email: "bilal@example.com" };
const jpeg = () => sharp({ create: { width: 1200, height: 800, channels: 3, background: "#806040" } }).jpeg().toBuffer();

let galleries: Record<string, Handler>, gallery: Record<string, Handler>, members: Record<string, Handler>, photos: Record<string, Handler>;
let publicPhotos: Record<string, Handler>, download: Record<string, Handler>, drive: Record<string, Handler>;
const ids: { a?: string; b?: string; photoA?: string; photoB?: string } = {};

test("setup: admin creates two galleries with different families and photos", async () => {
  galleries = await route("../app/api/admin/galleries/route");
  gallery = await route("../app/api/admin/galleries/[id]/route");
  members = await route("../app/api/admin/galleries/[id]/members/route");
  photos = await route("../app/api/admin/galleries/[id]/photos/route");
  drive = await route("../app/api/admin/galleries/[id]/drive/route");
  publicPhotos = await route("../app/api/galleries/[id]/photos/route");
  download = await route("../app/api/galleries/[id]/photos/[photoId]/download/route");
  ({ prisma } = await import("../lib/prisma"));

  session = ADMIN;
  for (const [key, title, email] of [["a", "Family A", "Amina@Example.com"], ["b", "Family B", "bilal@example.com"]] as const) {
    const g = await call(galleries.POST, {}, { method: "POST", body: { title } });
    assert.equal(g.status, 200, JSON.stringify(g.json));
    const id = (g.json.gallery as { id: string }).id;
    ids[key] = id;
    assert.equal((await call(members.POST, { id }, { method: "POST", body: { email } })).status, 200);
    const signed = await call(photos.POST, { id }, { method: "POST", body: { action: "sign", ext: "jpg" } });
    assert.equal(signed.status, 200);
    const put = await fetch(signed.json.uploadUrl as string, { method: "PUT", body: new Uint8Array(await jpeg()) });
    assert.equal(put.status, 200);
    const commit = await call(photos.POST, { id }, { method: "POST", body: { action: "commit", path: signed.json.path } });
    assert.equal(commit.status, 200, JSON.stringify(commit.json));
    ids[key === "a" ? "photoA" : "photoB"] = (commit.json.photo as { id: string }).id;
  }
  const stored = await prisma.familyPhoto.findUniqueOrThrow({ where: { id: ids.photoA! } });
  assert.equal(stored.width, 1200);
  assert.ok(objects.has(`family/${stored.thumbPath}`) && objects.has(`family/${stored.displayPath}`) && objects.has(`family/${stored.originalPath}`));
  const thumbMeta = await sharp(objects.get(`family/${stored.thumbPath}`)!).metadata();
  assert.equal(thumbMeta.format, "webp");
  assert.ok((thumbMeta.width ?? 0) <= 640);
});

test("anonymous visitors and signed-in customers can't use admin gallery routes", async () => {
  for (const s of [{ userId: null }, FAMILY_A]) {
    session = s;
    const expect = s.userId ? 403 : 401;
    assert.equal((await call(galleries.GET, {})).status, expect);
    assert.equal((await call(galleries.POST, {}, { method: "POST", body: { title: "Mine" } })).status, expect);
    assert.equal((await call(members.POST, { id: ids.b! }, { method: "POST", body: { email: "amina@example.com" } })).status, expect, "can't grant themselves access");
    assert.equal((await call(photos.POST, { id: ids.b! }, { method: "POST", body: { action: "sign", ext: "jpg" } })).status, expect);
    assert.equal((await call(gallery.PATCH, { id: ids.b! }, { method: "PATCH", body: { allowDownloads: true } })).status, expect);
    assert.equal((await call(gallery.DELETE, { id: ids.b! }, { method: "DELETE" })).status, expect);
    assert.equal((await call(drive.POST, { id: ids.b! }, { method: "POST", body: { action: "list", folder: "x" } })).status, expect);
  }
});

test("anonymous visitors get nothing from private gallery routes", async () => {
  session = { userId: null };
  const r = await call(publicPhotos.GET, { id: ids.a! });
  assert.equal(r.status, 401);
  assert.equal(r.json.photos, undefined);
  assert.equal((await call(download.GET, { id: ids.a!, photoId: ids.photoA! })).status, 401);
  assert.match(r.headers.get("x-robots-tag") ?? "", /noindex/);
});

test("Family A sees only Family A; Family B's gallery and photos are 404 for them", async () => {
  session = FAMILY_A;
  const own = await call(publicPhotos.GET, { id: ids.a! }, { url: "http://x/api" });
  assert.equal(own.status, 200);
  const list = own.json.photos as { id: string; thumb: string; display: string }[];
  assert.deepEqual(list.map((p) => p.id), [ids.photoA]);
  assert.match(list[0].thumb, /\/object\/sign\/family\/.+token=/, "expiring signed URL");
  assert.doesNotMatch(list[0].thumb, /\/object\/public\//);
  assert.doesNotMatch(JSON.stringify(own.json), /original/, "originals are never listed");

  assert.equal((await call(publicPhotos.GET, { id: ids.b! })).status, 404);
  assert.equal((await call(download.GET, { id: ids.b!, photoId: ids.photoB! })).status, 404);
  assert.notEqual((await call(download.GET, { id: ids.a!, photoId: ids.photoB! })).status, 302, "another family's photo id via your own gallery");

  session = FAMILY_B;
  const b = await call(publicPhotos.GET, { id: ids.b! });
  assert.deepEqual((b.json.photos as { id: string }[]).map((p) => p.id), [ids.photoB]);
  assert.equal((await call(publicPhotos.GET, { id: ids.a! })).status, 404);
});

test("an unverified email that matches a member grants nothing", async () => {
  session = { userId: "user_imposter", email: "amina@example.com", verified: false };
  assert.equal((await call(publicPhotos.GET, { id: ids.a! })).status, 404);
});

test("original downloads need the owner's permission; private files have no public URL", async () => {
  session = FAMILY_A;
  assert.equal((await call(download.GET, { id: ids.a!, photoId: ids.photoA! })).status, 403);
  session = ADMIN;
  assert.equal((await call(gallery.PATCH, { id: ids.a! }, { method: "PATCH", body: { allowDownloads: true } })).status, 200);
  session = FAMILY_A;
  const d = await call(download.GET, { id: ids.a!, photoId: ids.photoA! });
  assert.equal(d.status, 302);
  assert.match(d.location ?? "", /\/object\/sign\/family\/.+token=.+download=/);
  assert.equal((await call(download.GET, { id: ids.a!, photoId: ids.photoB! })).status, 404, "another family's photo id via your own gallery");

  const stored = await prisma.familyPhoto.findUniqueOrThrow({ where: { id: ids.photoA! } });
  const direct = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/public/family/${stored.originalPath}`);
  assert.equal(direct.status, 400, "the family bucket refuses public reads");
  const unsigned = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/authenticated/family/${stored.originalPath}`);
  assert.equal(unsigned.status, 401, "no access without the server key");
});

test("archiving hides a gallery from members; revoking access is immediate", async () => {
  session = ADMIN;
  await call(gallery.PATCH, { id: ids.a! }, { method: "PATCH", body: { status: "archived" } });
  session = FAMILY_A;
  assert.equal((await call(publicPhotos.GET, { id: ids.a! })).status, 404);
  session = ADMIN;
  assert.equal((await call(publicPhotos.GET, { id: ids.a! })).status, 200, "admins can still open archived galleries");
  await call(gallery.PATCH, { id: ids.a! }, { method: "PATCH", body: { status: "active" } });
  await call(members.DELETE, { id: ids.a! }, { method: "DELETE", body: { email: "amina@example.com" } });
  session = FAMILY_A;
  assert.equal((await call(publicPhotos.GET, { id: ids.a! })).status, 404);
});

test("uploads can't be committed into another gallery, and deleting removes the files", async () => {
  session = ADMIN;
  const other = await prisma.familyPhoto.findUniqueOrThrow({ where: { id: ids.photoB! } });
  assert.equal((await call(photos.POST, { id: ids.a! }, { method: "POST", body: { action: "commit", path: other.originalPath } })).status, 400);
  assert.equal((await call(gallery.DELETE, { id: ids.b! }, { method: "DELETE" })).status, 200);
  assert.equal(await prisma.familyPhoto.count({ where: { galleryId: ids.b! } }), 0);
  assert.ok(![...objects.keys()].some((k) => k.includes(ids.b!)), "stored files removed");
});
