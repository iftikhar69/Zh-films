import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { RentDesk } from "@/components/gear/RentDesk";
import { PUBLIC_GEAR_SELECT, publicGearWhere } from "@/lib/gear";
import { buildPageMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Rent Camera Gear",
  description: "Rent the equipment ZH Films uses on weddings across Gilgit-Baltistan and Lahore. Request your dates.",
  path: "/rent"
});

export default async function Page() {
  const items = await prisma.gearItem.findMany({
    where: publicGearWhere("rent"),
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: PUBLIC_GEAR_SELECT
  });
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Rent", path: "/rent" }])} />
      <RentDesk items={items} />
    </>
  );
}
