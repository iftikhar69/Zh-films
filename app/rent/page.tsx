import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { GearBay } from "@/components/gear/GearBay";
import { buildPageMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Rent Gear",
  description: "Rent Sony cameras, gimbals, and production cars from ZH Films Lahore.",
  path: "/rent"
});

export default async function RentPage() {
  const items = await prisma.gearItem.findMany({
    where: { OR: [{ listingType: "rent" }, { listingType: "both" }], available: true },
    orderBy: { sortOrder: "asc" }
  });
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Rent", path: "/rent" }])} />
      <GearBay items={items} mode="rent" />
    </>
  );
}
