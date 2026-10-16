import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { HireContent } from "@/components/hire/HireContent";
import { buildPageMetadata, breadcrumbJsonLd, JsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Hire Film Family",
  description:
    "Hire Zulfikar Hussain and the ZH Film Family — cinematographers, photographers, editors, drone, sound, and experts in Lahore.",
  path: "/hire"
});

export default async function HirePage() {
  const crew = await prisma.crewMember.findMany({ where: { published: true }, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }] });
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Hire", path: "/hire" }
        ])}
      />
      <HireContent crew={crew} />
    </>
  );
}
