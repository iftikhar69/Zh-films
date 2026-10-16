import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SellShowroom } from "@/components/gear/SellShowroom";
import { PUBLIC_GEAR_SELECT, publicGearWhere } from "@/lib/gear";
import { buildPageMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Buy Camera Gear",
  description: "Cameras, lenses and lighting from the ZH Films kit, sold directly with honest condition notes.",
  path: "/sell"
});

export default async function Page() {
  const items = await prisma.gearItem.findMany({
    where: publicGearWhere("sell"),
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: PUBLIC_GEAR_SELECT
  });
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Sell", path: "/sell" }])} />
      <SellShowroom items={items} />
    </>
  );
}
