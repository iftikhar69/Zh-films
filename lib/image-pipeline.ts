import "server-only";
import sharp from "sharp";

export const MAX_SOURCE_BYTES = 40 * 1024 * 1024;

export type Rendition = { buffer: Buffer; width: number; height: number };
export type Processed = { display: Rendition; thumb: Rendition; width: number; height: number; mime: string; ext: string };

const KINDS: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" }
];

/** Detects the real type from the bytes; the uploaded name or browser type is never trusted. */
export function sniffImage(bytes: Buffer) {
  return KINDS.find((k) => k.test(bytes)) ?? null;
}

async function render(bytes: Buffer, max: number, quality: number): Promise<Rendition> {
  // rotate() applies the camera orientation; sharp drops EXIF (incl. GPS location) unless asked to keep it.
  const { data, info } = await sharp(bytes, { failOn: "error" })
    .rotate()
    .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height };
}

/** A web-sized version (long edge 2048) and a grid thumbnail (long edge 640), both WebP. */
export async function processImage(bytes: Buffer): Promise<Processed> {
  const kind = sniffImage(bytes);
  if (!kind) throw new Error("Use a JPG, PNG or WebP image.");
  if (bytes.length > MAX_SOURCE_BYTES) throw new Error("Images must be 40 MB or smaller.");
  const meta = await sharp(bytes).rotate().metadata();
  const [display, thumb] = await Promise.all([render(bytes, 2048, 82), render(bytes, 640, 72)]);
  const turned = (meta.orientation ?? 1) >= 5;
  return {
    display,
    thumb,
    width: (turned ? meta.height : meta.width) ?? display.width,
    height: (turned ? meta.width : meta.height) ?? display.height,
    mime: kind.mime,
    ext: kind.ext
  };
}
