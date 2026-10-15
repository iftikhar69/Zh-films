import { readdir } from "node:fs/promises";
import path from "node:path";
import { adminPageGuard } from "@/lib/admin-guard";
import { getCatalog } from "@/lib/catalog";
import { PackagesForm } from "@/components/admin/PackagesForm";

export const dynamic = "force-dynamic";

async function mediaImages() {
  try {
    const dir = path.join(process.cwd(), "public", "media", "instagram");
    return (await readdir(dir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort().map((f) => `/media/instagram/${f}`);
  } catch {
    return [];
  }
}

export default async function PackagesPage() {
  await adminPageGuard("/admin/packages");
  const [catalog, images] = await Promise.all([getCatalog(), mediaImages()]);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-white sm:text-4xl">Packages &amp; add-ons</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Prices here are what customers see and what the server uses to calculate estimates. Changing a price never
          changes requests already received — set a custom quote on the booking for negotiated deals.
        </p>
      </header>
      <PackagesForm initial={catalog} images={images} />
    </div>
  );
}
