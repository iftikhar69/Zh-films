import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

/** Outside /public — receipts are only ever streamed through an admin-checked route. */
const ROOT = path.resolve(process.env.RECEIPTS_DIR || path.join(process.cwd(), "storage", "receipts"));

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  { mime: "application/pdf", ext: "pdf", test: (b) => b.subarray(0, 5).toString() === "%PDF-" }
];

export type ReceiptCheck = { ok: true; mime: string; ext: string; bytes: Buffer } | { ok: false; error: string };

/** Validates by actual file content, not the browser-supplied name or type. */
export async function checkReceipt(file: File): Promise<ReceiptCheck> {
  if (file.size === 0) return { ok: false, error: "The receipt file is empty." };
  if (file.size > MAX_RECEIPT_BYTES) return { ok: false, error: "Receipts must be 5 MB or smaller." };
  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = SIGNATURES.find((s) => s.test(bytes));
  if (!kind) return { ok: false, error: "Upload a JPG, PNG, WebP or PDF receipt." };
  return { ok: true, mime: kind.mime, ext: kind.ext, bytes };
}

export async function storeReceipt(bytes: Buffer, ext: string) {
  await mkdir(ROOT, { recursive: true });
  const name = `${Date.now()}-${randomBytes(12).toString("hex")}.${ext}`;
  await writeFile(path.join(ROOT, name), bytes, { mode: 0o600 });
  return name;
}

export async function readReceipt(name: string) {
  if (!/^[\w-]+\.(jpg|png|webp|pdf)$/.test(name)) throw new Error("Invalid receipt path");
  return readFile(path.join(ROOT, name));
}
