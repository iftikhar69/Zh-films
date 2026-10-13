import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { GearBay } from "@/components/gear/GearBay";
import { buildPageMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Sell / Buy Gear",
  description: "Buy cameras and lenses from the ZH Films vault — contact Zulfikar Hussain.",
  path: "/sell"
});

export default async function SellPage() {
  const items = await prisma.gearItem.findMany({
    where: { OR: [{ listingType: "sell" }, { listingType: "both" }], available: true },
    orderBy: { sortOrder: "asc" }
  });
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Sell", path: "/sell" }])} />
      <GearBay items={items} mode="sell" />
    </>
  );
}
