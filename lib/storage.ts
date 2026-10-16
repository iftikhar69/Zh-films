import "server-only";

/**
 * Supabase Storage over its REST API (no extra SDK). The secret key never leaves the server.
 * Buckets: `public-previews` (public), `originals` and `family` (private, signed URLs only).
 */
export type Bucket = "public-previews" | "originals" | "family";

export class StorageError extends Error {}

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new StorageError("Storage is not configured (SUPABASE_URL / SUPABASE_SECRET_KEY).");
  return { url, key };
}

export function storageConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

const SAFE_PATH = /^[a-z0-9][a-z0-9/_.-]{2,200}$/i;
function checkPath(path: string) {
  if (!SAFE_PATH.test(path) || path.includes("..")) throw new StorageError("Invalid storage path");
  return path;
}

async function call(path: string, init: RequestInit) {
  const { url, key } = config();
  const res = await fetch(`${url}/storage/v1${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, ...(init.headers ?? {}) },
    cache: "no-store"
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new StorageError(`Storage request failed (${res.status}) ${text.slice(0, 200)}`);
  }
  return res;
}

export async function uploadObject(bucket: Bucket, path: string, body: Buffer | Uint8Array, contentType: string) {
  await call(`/object/${bucket}/${checkPath(path)}`, {
    method: "POST",
    headers: { "Content-Type": contentType, "x-upsert": "true", "cache-control": "max-age=31536000" },
    body: body as BodyInit
  });
  return path;
}

/** A one-time URL the admin's browser can PUT a file to directly (bypasses the host's request-size limit). */
export async function createSignedUploadUrl(bucket: Bucket, path: string) {
  const res = await call(`/object/upload/sign/${bucket}/${checkPath(path)}`, { method: "POST" });
  const json = (await res.json()) as { url: string };
  return `${config().url}/storage/v1${json.url}`;
}

export async function signedUrl(bucket: Bucket, path: string, expiresIn = 3600, download?: string) {
  const urls = await signedUrls(bucket, [path], expiresIn, download);
  return urls[0];
}

/** Expiring links for private objects. Generated per request, after authorization. */
export async function signedUrls(bucket: Bucket, paths: string[], expiresIn = 3600, download?: string) {
  if (!paths.length) return [];
  const res = await call(`/object/sign/${bucket}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn, paths: paths.map(checkPath) })
  });
  const json = (await res.json()) as { signedURL: string | null; path: string }[];
  const base = config().url;
  return paths.map((p) => {
    const hit = json.find((j) => j.path === p)?.signedURL;
    if (!hit) return null;
    const href = `${base}/storage/v1${hit}`;
    return download ? `${href}&download=${encodeURIComponent(download)}` : href;
  });
}

export function publicUrl(path: string) {
  return `${config().url}/storage/v1/object/public/public-previews/${checkPath(path)}`;
}

export async function removeObjects(bucket: Bucket, paths: string[]) {
  const list = paths.filter(Boolean).map(checkPath);
  if (!list.length) return;
  await call(`/object/${bucket}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: list })
  });
}
