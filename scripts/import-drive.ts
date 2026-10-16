// One-off import of the owner's public Drive folders into Supabase Storage + Postgres.
// Run with: npm run import:drive -- team gear
// Safe to re-run: records are keyed by Drive file id and photos are replaced, not duplicated.
import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma";
import { downloadPublicFile, listPublicFolder } from "../lib/drive";
import { processImage } from "../lib/image-pipeline";
import { publicUrl, removeObjects, storageConfigured, uploadObject } from "../lib/storage";
import { DRIVE_FOLDERS, GEAR_PHOTOS, teamFromFileName } from "../lib/drive-catalog";
import { draftName } from "../lib/gear";

async function storePhoto(prefix: string, bytes: Buffer) {
  const img = await processImage(bytes);
  const hash = createHash("sha1").update(bytes).digest("hex").slice(0, 12);
  const display = `${prefix}/${hash}-display.webp`;
  const thumb = `${prefix}/${hash}-thumb.webp`;
  await uploadObject("public-previews", display, img.display.buffer, "image/webp");
  await uploadObject("public-previews", thumb, img.thumb.buffer, "image/webp");
  return { display, thumb };
}

async function verify(url: string) {
  const res = await fetch(url, { method: "HEAD" });
  if (!res.ok) throw new Error(`stored image does not resolve (${res.status})`);
}

async function importTeam() {
  const files = await listPublicFolder(DRIVE_FOLDERS.team);
  console.log(`team: ${files.length} photos listed`);
  let order = 1;
  for (const f of files) {
    try {
      const entry = teamFromFileName(f.name);
      const { display, thumb } = await storePhoto(`team/${f.id}`, await downloadPublicFile(f.id));
      const image = publicUrl(display);
      await verify(image);
      const before = await prisma.crewMember.findUnique({ where: { sourceId: f.id }, select: { imagePaths: true } });
      const slug = `team-${entry.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${f.id.slice(-4).toLowerCase()}`;
      await prisma.crewMember.upsert({
        where: { sourceId: f.id },
        create: { sourceId: f.id, slug, ...entry, image, imagePaths: [display, thumb], sortOrder: order, published: true },
        update: { image, imagePaths: [display, thumb], sortOrder: order, published: true }
      });
      const stale = (before?.imagePaths ?? []).filter((p) => p !== display && p !== thumb);
      if (stale.length) await removeObjects("public-previews", stale);
      console.log(`  ok   ${f.name} -> ${entry.name} (${entry.title})`);
    } catch (e) {
      console.log(`  FAIL ${f.name}: ${(e as Error).message}`);
    }
    order++;
  }
}

async function importGear() {
  const files = await listPublicFolder(DRIVE_FOLDERS.gear);
  console.log(`gear: ${files.length} photos listed`);
  let order = 1;
  for (const f of files) {
    try {
      const known = GEAR_PHOTOS[f.id];
      const slug = `drive-${f.id.toLowerCase()}`;
      const existing = await prisma.gearItem.findUnique({ where: { slug }, select: { id: true, imagePaths: true } });
      const item =
        existing ??
        (await prisma.gearItem.create({
          data: {
            slug,
            name: known?.name ?? draftName(f.name),
            brand: known?.brand ?? "",
            category: known?.category ?? "other",
            listingType: "both",
            status: known ? "enquiry" : "draft",
            priceLabel: "",
            description: "",
            image: "",
            sortOrder: order
          },
          select: { id: true, imagePaths: true }
        }));
      const { display, thumb } = await storePhoto(`gear/${item.id}`, await downloadPublicFile(f.id));
      const image = publicUrl(display);
      await verify(image);
      await prisma.gearItem.update({ where: { id: item.id }, data: { image, imageThumb: publicUrl(thumb), imagePaths: [display, thumb] } });
      const stale = item.imagePaths.filter((p) => p !== display && p !== thumb);
      if (stale.length) await removeObjects("public-previews", stale);
      console.log(`  ok   ${f.name} -> ${known?.name ?? "draft (name it in admin)"}`);
    } catch (e) {
      console.log(`  FAIL ${f.name}: ${(e as Error).message}`);
    }
    order++;
  }
}

async function main() {
  if (!storageConfigured()) throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY first.");
  const which = process.argv.slice(2);
  if (!which.length || which.includes("team")) await importTeam();
  if (!which.length || which.includes("gear")) await importGear();
}

main()
  .catch((e) => {
    console.error(`Import failed: ${(e as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
