import "server-only";

/**
 * One-time imports from Google Drive folders shared as "anyone with the link". No Google API key
 * is used: if the folder is restricted, listing fails and the owner uploads files directly instead.
 */
export type DriveFile = { id: string; name: string };

export function driveFolderId(input: string) {
  const m = input.match(/folders\/([A-Za-z0-9_-]{10,})/) ?? input.match(/^([A-Za-z0-9_-]{10,})$/);
  return m?.[1] ?? null;
}

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export function parseFolderListing(html: string): DriveFile[] {
  const out: DriveFile[] = [];
  const re = /<div class="flip-entry" id="entry-([A-Za-z0-9_-]+)"[\s\S]*?flip-entry-title">([^<]*)</g;
  for (let m = re.exec(html); m; m = re.exec(html)) out.push({ id: m[1], name: decode(m[2]).trim() });
  return out.filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name));
}

export async function listPublicFolder(folderId: string) {
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}`, { cache: "no-store" });
  if (res.status === 401 || res.status === 403 || res.status === 404) {
    throw new Error("This Drive folder isn't shared as “Anyone with the link”, so it can't be listed. Upload the photos directly instead.");
  }
  if (!res.ok) throw new Error(`Google Drive returned ${res.status}`);
  return parseFolderListing(await res.text());
}

export async function downloadPublicFile(fileId: string) {
  if (!/^[A-Za-z0-9_-]{10,}$/.test(fileId)) throw new Error("Invalid Drive file id");
  const res = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`, { cache: "no-store", redirect: "follow" });
  if (!res.ok) throw new Error(`Couldn't download this file from Drive (${res.status}).`);
  const type = res.headers.get("content-type") ?? "";
  if (type.startsWith("text/html")) throw new Error("Drive didn't return an image (the file may be private or too large to fetch directly).");
  return Buffer.from(await res.arrayBuffer());
}
