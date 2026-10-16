import { prisma } from "@/lib/prisma";
import { adminPageGuard } from "@/lib/admin-guard";
import { storageConfigured } from "@/lib/storage";
import { GearManager } from "@/components/admin/gear/GearManager";

export const dynamic = "force-dynamic";

export default async function AdminGearPage() {
  await adminPageGuard("/admin/gear");
  const items = await prisma.gearItem.findMany({ orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { name: "asc" }] });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-white">Equipment for sale & rent</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Only listings you publish appear on the Sell and Rent pages. Drafts stay hidden. Prices, condition and what&apos;s
          included are shown exactly as you enter them — leave a price empty to show &ldquo;Price on enquiry&rdquo;.
        </p>
      </header>
      {!storageConfigured() ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100">
          Storage isn&apos;t configured. Add SUPABASE_URL and SUPABASE_SECRET_KEY to upload photos.
        </p>
      ) : null}
      <GearManager
        items={items.map((g) => ({
          id: g.id,
          name: g.name,
          brand: g.brand,
          category: g.category,
          listingType: g.listingType,
          status: g.status,
          salePrice: g.salePrice,
          rentPrice: g.rentPrice,
          rentUnit: g.rentUnit,
          priceLabel: g.priceLabel,
          condition: g.condition,
          includes: g.includes,
          description: g.description,
          sortOrder: g.sortOrder,
          imageThumb: g.imageThumb || (g.image.startsWith("https://picsum.photos") ? "" : g.image),
          demo: g.image.startsWith("https://picsum.photos")
        }))}
      />
    </div>
  );
}
