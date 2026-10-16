import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { processImage } from "@/lib/image-pipeline";
import { publicUrl, removeObjects, uploadObject } from "@/lib/storage";

/** Stores web + thumbnail copies of a listing photo in the public bucket and sets it as the main image. */
export async function setGearImage(gearId: string, bytes: Buffer) {
  const img = await processImage(bytes);
  const id = randomBytes(8).toString("hex");
  const display = `gear/${gearId}/${id}-display.webp`;
  const thumb = `gear/${gearId}/${id}-thumb.webp`;
  await Promise.all([
    uploadObject("public-previews", display, img.display.buffer, "image/webp"),
    uploadObject("public-previews", thumb, img.thumb.buffer, "image/webp")
  ]);
  const before = await prisma.gearItem.findUnique({ where: { id: gearId }, select: { imagePaths: true } });
  await prisma.gearItem.update({
    where: { id: gearId },
    data: { image: publicUrl(display), imageThumb: publicUrl(thumb), imagePaths: [display, thumb] }
  });
  if (before?.imagePaths.length) await removeObjects("public-previews", before.imagePaths).catch(() => {});
}

export async function removeGearImages(paths: string[]) {
  if (paths.length) await removeObjects("public-previews", paths);
}
